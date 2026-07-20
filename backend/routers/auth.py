# routers/auth.py
# Authentication endpoints: signup, login, logout, refresh, me,
# email verification, forgot/reset password.

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.email import send_email
from core.security import (
    hash_password, verify_password, create_access_token, decode_access_token,
    generate_opaque_token, hash_opaque_token,
    REFRESH_TOKEN_TTL_DAYS, EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_HOURS,
)
from core.rate_limit import RateLimiter
from models.user import (
    User, RefreshToken, ActionToken,
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
)

router  = APIRouter(prefix="/api/auth", tags=["Auth"])
bearer  = HTTPBearer(auto_error=False)

# Brute-force protection: existing limits on the endpoints that were already
# here, plus new ones sized to each new endpoint's actual abuse profile.
login_rate_limit               = RateLimiter(times=10, seconds=300,  scope="login")
signup_rate_limit              = RateLimiter(times=5,  seconds=300,  scope="signup")
refresh_rate_limit             = RateLimiter(times=30, seconds=3600, scope="refresh")
logout_rate_limit              = RateLimiter(times=20, seconds=300,  scope="logout")
# Forgot-password is the classic email-bombing vector — kept deliberately tight.
forgot_password_rate_limit     = RateLimiter(times=3,  seconds=3600, scope="forgot-password")
reset_password_rate_limit      = RateLimiter(times=5,  seconds=3600, scope="reset-password")
resend_verification_rate_limit = RateLimiter(times=3,  seconds=3600, scope="resend-verification")
verify_email_rate_limit        = RateLimiter(times=10, seconds=3600, scope="verify-email")


# ── Dependency: current user from access token ─────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_verified_email(feature_key: str):
    """Dependency factory for gating a *specific* endpoint behind email
    verification, without hard-coding that requirement into the auth system
    itself. Enforcement is entirely config-driven
    (EMAIL_VERIFICATION_REQUIRED_FEATURES in core/config.py) — wiring a new
    endpoint with Depends(require_verified_email("builds.create")) has zero
    effect until "builds.create" is actually added to that env var. No
    endpoint uses this today; it's infrastructure for features like billing,
    premium subscriptions, or public build-sharing that don't exist yet, so
    there's nothing current worth gating without a product decision this
    session isn't making unilaterally.

    Usage: replace `Depends(get_current_user)` with
    `Depends(require_verified_email("some.feature.key"))` on the endpoint
    that should be gated.
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if (
            feature_key in settings.email_verification_required_features
            and not current_user.email_verified
        ):
            raise HTTPException(
                status_code=403,
                detail="Please verify your email address to use this feature.",
            )
        return current_user
    return dependency


# ── Cookie helpers ──────────────────────────────────────────────────────────────
# SameSite=None + Secure is required for the cookie to survive the real
# cross-origin Vercel<->Railway split in production; that combination
# requires HTTPS, which local dev doesn't have, so dev falls back to
# SameSite=Lax (still sent, since frontend+backend are both on `localhost`,
# just different ports — same registrable domain, which is what SameSite
# actually keys on). Mirrors the existing `if settings.is_production`
# pattern already used for HSTS/docs visibility in main.py.

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        max_age=REFRESH_TOKEN_TTL_DAYS * 24 * 3600,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
    )


# ── Session issuance (shared by signup + login) ─────────────────────────────────

def _issue_session(db: Session, user: User, request: Request, response: Response) -> Token:
    raw_refresh = generate_opaque_token()
    raw_csrf    = generate_opaque_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw_refresh),
        csrf_token_hash=hash_opaque_token(raw_csrf),
        user_agent=(request.headers.get("user-agent") or "")[:500],
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
    ))
    db.commit()

    _set_refresh_cookie(response, raw_refresh)

    return Token(
        access_token=create_access_token(user.id),
        csrf_token=raw_csrf,
        user=UserResponse.model_validate(user),
    )


def _verify_csrf_header(request: Request, refresh_row: RefreshToken) -> None:
    presented = request.headers.get("x-csrf-token", "")
    if not presented or hash_opaque_token(presented) != refresh_row.csrf_token_hash:
        raise HTTPException(status_code=403, detail="Invalid or missing CSRF token")


# ── Email content ────────────────────────────────────────────────────────────────

def _send_verification_email(user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={raw_token}"
    send_email(
        to=user.email,
        subject="Verify your CarMods AI email",
        text=(
            f"Hi {user.name},\n\n"
            f"Confirm your email address to finish setting up your CarMods AI account:\n"
            f"{link}\n\n"
            f"This link expires in {EMAIL_VERIFICATION_TTL_HOURS} hours. "
            f"If you didn't create this account, you can ignore this email."
        ),
    )


def _send_reset_email(user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={raw_token}"
    send_email(
        to=user.email,
        subject="Reset your CarMods AI password",
        text=(
            f"Hi {user.name},\n\n"
            f"Someone requested a password reset for this account. If that was you:\n"
            f"{link}\n\n"
            f"This link expires in {PASSWORD_RESET_TTL_HOURS} hour(s) and can only be used once. "
            f"If you didn't request this, you can safely ignore this email — "
            f"your password won't change unless you click the link above and set a new one."
        ),
    )


def _create_action_token(db: Session, user: User, purpose: str, ttl_hours: int) -> str:
    raw = generate_opaque_token()
    db.add(ActionToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
    ))
    db.commit()
    return raw


def _consume_action_token(db: Session, raw_token: str, purpose: str) -> User:
    """Look up, validate, and mark-used an action token in one place —
    shared by verify-email and reset-password so the single-use/expiry
    semantics can't drift between the two."""
    row = (
        db.query(ActionToken)
        .filter(
            ActionToken.token_hash == hash_opaque_token(raw_token),
            ActionToken.purpose == purpose,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=400, detail="This link is invalid.")
    if row.used_at is not None:
        raise HTTPException(status_code=400, detail="This link has already been used.")
    if row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This link has expired. Please request a new one.")

    row.used_at = datetime.utcnow()
    db.commit()

    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="This link is no longer valid.")
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=Token, status_code=201, dependencies=[Depends(signup_rate_limit)])
def signup(data: UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    """Create a new account, send a verification email, and return a session.
    Verification is a soft gate today — the account is fully usable
    immediately (see require_verified_email() above for why, and how that
    can change later without touching this endpoint)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    user = User(
        name          = data.name,
        email         = data.email,
        password_hash = hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_token = _create_action_token(db, user, "verify_email", EMAIL_VERIFICATION_TTL_HOURS)
    _send_verification_email(user, verify_token)

    return _issue_session(db, user, request, response)


@router.post("/login", response_model=Token, dependencies=[Depends(login_rate_limit)])
def login(data: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    """Authenticate and return a new session."""
    user = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    if settings.require_email_verification_to_login and not user.email_verified:
        # The blanket hard-gate switch — off by default (see core/config.py).
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox, or request a new link.",
        )

    return _issue_session(db, user, request, response)


@router.post("/refresh", response_model=Token, dependencies=[Depends(refresh_rate_limit)])
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Exchange a valid refresh cookie for a new access token, rotating the
    refresh token itself in the process (each one is single-use).

    Reuse of an already-rotated-away token is treated as a signal of theft:
    every refresh token for that user is revoked, forcing a real re-login
    everywhere rather than silently trusting a token that shouldn't exist
    anymore."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(raw_token)).first()
    if row is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired — please log in again")

    if row.revoked_at is not None:
        # Reuse of a rotated-away token — revoke everything for this user.
        db.query(RefreshToken).filter(
            RefreshToken.user_id == row.user_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.utcnow()})
        db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired — please log in again")

    if row.expires_at < datetime.utcnow():
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired — please log in again")

    _verify_csrf_header(request, row)

    user = db.query(User).filter(User.id == row.user_id, User.is_active == True).first()
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Session expired — please log in again")

    row.revoked_at   = datetime.utcnow()
    row.last_used_at = datetime.utcnow()
    db.commit()

    return _issue_session(db, user, request, response)


@router.post("/logout", dependencies=[Depends(logout_rate_limit)])
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Real server-side session revocation — clearing localStorage client-side
    used to be the entire "logout," which left the access token valid for up
    to 7 days and the refresh cookie (now) valid for 30. This actually kills
    the session."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(raw_token)).first()
        if row is not None and row.revoked_at is None:
            _verify_csrf_header(request, row)
            row.revoked_at = datetime.utcnow()
            db.commit()
    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.post("/verify-email", dependencies=[Depends(verify_email_rate_limit)])
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = _consume_action_token(db, data.token, "verify_email")
    user.email_verified = True
    db.commit()
    return {"detail": "Email verified"}


@router.post("/resend-verification", dependencies=[Depends(resend_verification_rate_limit)])
def resend_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email_verified:
        return {"detail": "Email already verified"}
    token = _create_action_token(db, current_user, "verify_email", EMAIL_VERIFICATION_TTL_HOURS)
    _send_verification_email(current_user, token)
    return {"detail": "Verification email sent"}


@router.post("/forgot-password", dependencies=[Depends(forgot_password_rate_limit)])
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always returns the same response whether or not the email exists —
    the alternative (a distinct "no account with that email" error) lets an
    attacker enumerate registered emails one guess at a time."""
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is not None and user.is_active:
        token = _create_action_token(db, user, "reset_password", PASSWORD_RESET_TTL_HOURS)
        _send_reset_email(user, token)
    return {"detail": "If an account exists for that email, we've sent a password reset link."}


@router.post("/reset-password", dependencies=[Depends(reset_password_rate_limit)])
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = _consume_action_token(db, data.token, "reset_password")
    user.password_hash = hash_password(data.new_password)
    # A password reset is frequently prompted by suspected compromise —
    # kill every existing session rather than leaving old ones valid.
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()})
    db.commit()
    return {"detail": "Password reset. Please log in with your new password."}
