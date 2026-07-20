# core/security.py
# Password hashing and JWT-style token utilities — stdlib only, no extra deps.

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

from core.config import settings


# ── Password hashing ──────────────────────────────────────────────────────────
# Uses PBKDF2-HMAC-SHA256 with 260k iterations + 16-byte random salt.
# Comparable to bcrypt cost-12.

_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    """Return a salted hash string suitable for DB storage."""
    salt = secrets.token_hex(16)          # 32-char hex string
    h    = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), _ITERATIONS
    )
    return f"{salt}:{h.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    """Constant-time comparison of plain text against stored hash."""
    try:
        salt, h_hex = stored.split(":", 1)
    except ValueError:
        return False
    expected = hashlib.pbkdf2_hmac(
        "sha256", plain.encode(), salt.encode(), _ITERATIONS
    )
    return hmac.compare_digest(h_hex, expected.hex())


# ── Access token creation / decoding ──────────────────────────────────────────
# Simple signed token: base64url(json_payload) + "." + HMAC-SHA256 signature.
#
# 30 minutes, not the previous 7 days — safe now that a refresh mechanism
# exists (see below + routers/auth.py's /refresh). A leaked access token
# used to be unrevokable for up to a week; now the exposure window is
# bounded to however long it takes a session to next silently refresh.

ACCESS_TOKEN_TTL_SECONDS = 60 * 30   # 30 minutes


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": user_id,
        "exp": int(time.time()) + ACCESS_TOKEN_TTL_SECONDS,
        "iat": int(time.time()),
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).decode()
    sig = hmac.new(
        settings.secret_key.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def decode_access_token(token: str) -> Optional[int]:
    """Return user_id if token is valid and unexpired, else None."""
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(
            settings.secret_key.encode(),
            payload_b64.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return int(payload["sub"])
    except Exception:
        return None


# ── Opaque tokens: refresh sessions, email verification, password reset ──────
# All three share one shape: generate a random raw value, hand the raw value
# to the client (cookie or email link), store only its hash. Unlike the
# access token above these are checked against the database (so they can be
# revoked/consumed), not just cryptographically verified — that's the actual
# design difference, not an arbitrary inconsistency: access tokens need to be
# checked on every request without a DB round-trip; these are checked rarely
# enough (session refresh, one-time email links) that a DB lookup is cheap
# and buys real revocation, which a pure signature can't do.

REFRESH_TOKEN_TTL_DAYS         = 30
EMAIL_VERIFICATION_TTL_HOURS   = 24
PASSWORD_RESET_TTL_HOURS       = 1   # shorter — higher-risk if intercepted


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_opaque_token(raw: str) -> str:
    """SHA-256 hex digest. Not a secret-keyed HMAC — these tokens are already
    high-entropy random values (256 bits), so a plain hash is enough to make
    a stolen database useless without also leaking the raw token (which was
    only ever sent over the wire once, via cookie or email), the same
    reasoning as storing password hashes rather than a reversible form."""
    return hashlib.sha256(raw.encode()).hexdigest()
