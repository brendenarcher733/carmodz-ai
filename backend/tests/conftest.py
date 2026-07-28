# tests/conftest.py
#
# Test-database strategy: file-based SQLite in a per-session temp directory,
# NOT `sqlite:///:memory:`. A true in-memory SQLite DB is only visible to the
# connection that created it — SQLAlchemy's default pooling for `:memory:`
# URLs (SingletonThreadPool) gives each thread its own connection, and
# Starlette's TestClient runs sync endpoints via a threadpool, so requests
# handled on a different thread than the fixture setup would silently see an
# empty database. A temp *file* sidesteps this completely (every connection
# points at the same file on disk) with no engine/pooling changes needed in
# core/database.py itself — this is a test-infra decision, not an app change.
#
# The DATABASE_URL/REDIS_URL env vars MUST be set before `main` (or anything
# importing core.config/core.database) is imported anywhere in the process,
# since `core/config.py`'s settings and `core/database.py`'s engine are both
# built once at import time. conftest.py is guaranteed by pytest to be
# imported before any test module in the same directory, so setting them here
# first is sufficient — no test file should import `main`/`core.*` at
# module level before this file has run.

import os
import tempfile
import hashlib
import hmac
import json
import time

_tmp_dir = tempfile.mkdtemp(prefix="carmods_test_db_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_dir}/test.db"
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ["ENVIRONMENT"] = "development"  # never "production" — see get_settings()'s guard
os.environ["AI_PROVIDER"] = "mock"
os.environ["EMAIL_PROVIDER"] = "mock"
# Deliberately NOT setting STRIPE_* here — tests default to "billing
# unconfigured" (a realistic fresh-environment state); tests that need
# billing configured monkeypatch `core.config.settings` directly (see
# `configured_billing` fixture below), since `get_settings()` is
# process-lifetime-cached and can't be re-read from env vars mid-run.

import pytest
from fastapi.testclient import TestClient

import main  # noqa: E402 — must import after the env vars above are set
from core.config import settings  # noqa: E402
from core.database import Base, engine, SessionLocal  # noqa: E402
from models.user import User  # noqa: E402
from core.security import hash_password  # noqa: E402
from routers import auth as auth_router  # noqa: E402

# Every module-level RateLimiter instance in routers/auth.py — overridden to
# a no-op for the default `client` fixture so ordinary auth/billing tests
# aren't fighting each other over the same-IP shared rate-limit window.
# `raw_client` (no overrides) is what test_auth_rate_limiting.py uses instead
# to actually verify the 429 behavior.
_RATE_LIMITERS = [
    auth_router.login_rate_limit,
    auth_router.signup_rate_limit,
    auth_router.refresh_rate_limit,
    auth_router.logout_rate_limit,
    auth_router.forgot_password_rate_limit,
    auth_router.reset_password_rate_limit,
    auth_router.resend_verification_rate_limit,
    auth_router.verify_email_rate_limit,
]


@pytest.fixture(autouse=True)
def _fresh_tables():
    """Recreate all tables before every test — simplest reliable isolation
    given the app performs real `commit()`s inside request handlers (a
    savepoint/rollback-per-test pattern would fight those commits)."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    """A DB session for test-side setup/assertions — separate from whatever
    session the app itself opens per-request, but pointed at the same file,
    so writes from one are visible to the other."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """Rate limiting disabled — for the bulk of auth/billing tests, which
    are about the endpoint's actual logic, not brute-force protection."""
    for limiter in _RATE_LIMITERS:
        main.app.dependency_overrides[limiter] = lambda: None
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.clear()


@pytest.fixture
def raw_client():
    """No rate-limit overrides — real Redis-backed limiting active, for
    test_auth_rate_limiting.py specifically."""
    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def configured_billing(monkeypatch):
    """Flips billing "on" for a single test — settings is a process-wide
    cached singleton, so tests that need Stripe configured monkeypatch its
    attributes directly rather than relying on env vars (which are only read
    once, at first import)."""
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test_fake")
    monkeypatch.setattr(settings, "stripe_price_id_pro", "price_test_fake")
    return settings


@pytest.fixture
def captured_tokens(monkeypatch):
    """Intercepts the raw verify-email / password-reset tokens that would
    normally only ever go out over email — signup/forgot-password don't
    (and shouldn't) return them in the API response, so tests that need to
    drive the full verify/reset flow end-to-end capture them here instead of
    parsing log output."""
    sent = {"verify": [], "reset": []}

    def fake_verify(user, raw_token):
        sent["verify"].append((user.email, raw_token))

    def fake_reset(user, raw_token):
        sent["reset"].append((user.email, raw_token))

    monkeypatch.setattr(auth_router, "_send_verification_email", fake_verify)
    monkeypatch.setattr(auth_router, "_send_reset_email", fake_reset)
    return sent


# ── Factory helpers ──────────────────────────────────────────────────────────

def make_user(db, email="user@example.com", password="CorrectHorse9",
              name="Test User", email_verified=True, is_active=True, plan="free", **overrides):
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        email_verified=email_verified,
        is_active=is_active,
        plan=plan,
        **overrides,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client, email, password):
    """Drives the real /login endpoint rather than hand-constructing a
    session — exercises the actual issuance code path. Returns the parsed
    Token JSON; the refresh cookie is already stored in `client`'s own
    cookie jar (httpx.Client persists cookies across requests, like a
    browser) for any subsequent /refresh or /logout call in the same test."""
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()


def auth_headers(token_json):
    return {"Authorization": f"Bearer {token_json['access_token']}"}


def csrf_headers(token_json):
    return {"X-CSRF-Token": token_json["csrf_token"]}


# ── Stripe webhook signing ───────────────────────────────────────────────────
# Reproduces Stripe's real signing scheme (HMAC-SHA256 over
# "{timestamp}.{payload}") — the same technique already used manually via a
# Python shell to verify the webhook end-to-end during the original billing
# build, now codified as a reusable fixture.

def sign_stripe_payload(payload: dict, secret: str, timestamp: int | None = None) -> tuple[bytes, str]:
    ts = timestamp if timestamp is not None else int(time.time())
    body = json.dumps(payload).encode()
    signed_payload = f"{ts}.{body.decode()}"
    sig = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    header = f"t={ts},v1={sig}"
    return body, header


def stripe_event(event_type: str, data_object: dict, event_id="evt_test_1") -> dict:
    return {
        "id": event_id,
        "type": event_type,
        "data": {"object": data_object},
    }
