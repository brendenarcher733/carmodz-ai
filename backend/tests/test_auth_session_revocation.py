# tests/test_auth_session_revocation.py
#
# Three distinct revocation flows exist in this codebase, each with different
# blast radius — asserted side by side here so the differences are explicit
# rather than implied by three separate test files:
#   1. /logout            -> revokes only the single presented session
#   2. /refresh reuse      -> revokes EVERY session for that user (theft response)
#   3. /reset-password     -> revokes EVERY session for that user (compromise response)

from conftest import make_user, login, csrf_headers, auth_headers
from models.user import RefreshToken
from core.security import hash_opaque_token


def _two_sessions(client, email, password):
    tok_a = login(client, email, password)
    cookie_a = client.cookies.get("refresh_token")
    tok_b = login(client, email, password)
    cookie_b = client.cookies.get("refresh_token")
    return (tok_a, cookie_a), (tok_b, cookie_b)


def _is_revoked(db, cookie):
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(cookie)).first()
    return row.revoked_at is not None


def test_logout_revokes_only_one_session(client, db):
    make_user(db, email="rev-logout@example.com", password="CorrectHorse9")
    (tok_a, cookie_a), (tok_b, cookie_b) = _two_sessions(client, "rev-logout@example.com", "CorrectHorse9")

    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    client.post("/api/auth/logout", headers=csrf_headers(tok_a))

    assert _is_revoked(db, cookie_a) is True
    assert _is_revoked(db, cookie_b) is False


def test_refresh_reuse_revokes_every_session(client, db):
    make_user(db, email="rev-theft@example.com", password="CorrectHorse9")
    (tok_a, cookie_a), (tok_b, cookie_b) = _two_sessions(client, "rev-theft@example.com", "CorrectHorse9")

    # Rotate A once, then replay the stale cookie to trigger theft-detection.
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    client.post("/api/auth/refresh", headers=csrf_headers(tok_a))
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    client.post("/api/auth/refresh", headers=csrf_headers(tok_a))  # reuse -> kills all

    assert _is_revoked(db, cookie_a) is True
    assert _is_revoked(db, cookie_b) is True


def test_reset_password_revokes_every_session(client, db, captured_tokens):
    make_user(db, email="rev-reset@example.com", password="CorrectHorse9")
    (tok_a, cookie_a), (tok_b, cookie_b) = _two_sessions(client, "rev-reset@example.com", "CorrectHorse9")

    client.post("/api/auth/forgot-password", json={"email": "rev-reset@example.com"})
    raw_reset_token = captured_tokens["reset"][0][1]

    resp = client.post("/api/auth/reset-password", json={
        "token": raw_reset_token, "new_password": "BrandNewPass9",
    })
    assert resp.status_code == 200

    assert _is_revoked(db, cookie_a) is True
    assert _is_revoked(db, cookie_b) is True


def test_access_token_is_not_revocable_by_design(client, db):
    """Revoking a refresh session doesn't (and by design can't) invalidate an
    access token already issued from it — access tokens are self-contained
    HMAC-signed values, checked only against their own signature/expiry
    (core/security.py's decode_access_token), never against the DB. This
    asserts that's the actual, intended behavior (bounded by the 30-minute
    TTL), not an overlooked bug."""
    make_user(db, email="rev-access@example.com", password="CorrectHorse9")
    tok = login(client, "rev-access@example.com", "CorrectHorse9")

    client.post("/api/auth/logout", headers=csrf_headers(tok))

    # The refresh session is dead, but the access token issued alongside it
    # still authenticates /me until it naturally expires.
    resp = client.get("/api/auth/me", headers=auth_headers(tok))
    assert resp.status_code == 200
    assert resp.json()["email"] == "rev-access@example.com"
