# tests/test_auth_logout.py

from conftest import make_user, login, csrf_headers
from models.user import RefreshToken
from core.security import hash_opaque_token


def test_logout_revokes_session_and_clears_cookie(client, db):
    make_user(db, email="logout@example.com", password="CorrectHorse9")
    tok = login(client, "logout@example.com", "CorrectHorse9")
    cookie = client.cookies.get("refresh_token")

    resp = client.post("/api/auth/logout", headers=csrf_headers(tok))
    assert resp.status_code == 200
    assert resp.json() == {"detail": "Logged out"}

    row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(cookie)).first()
    assert row.revoked_at is not None
    assert "refresh_token" not in client.cookies or client.cookies.get("refresh_token") in (None, "")


def test_logout_missing_csrf_403(client, db):
    make_user(db, email="logout2@example.com", password="CorrectHorse9")
    login(client, "logout2@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 403


def test_logout_with_no_cookie_succeeds_without_csrf_check(client):
    """Documented edge case: if there's no session cookie at all, logout
    still returns 200 and doesn't require a CSRF header — there's nothing
    to revoke or protect."""
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    assert resp.json() == {"detail": "Logged out"}


def test_logout_only_revokes_the_current_session(client, db):
    make_user(db, email="multi@example.com", password="CorrectHorse9")
    tok_a = login(client, "multi@example.com", "CorrectHorse9")
    cookie_a = client.cookies.get("refresh_token")
    tok_b = login(client, "multi@example.com", "CorrectHorse9")
    cookie_b = client.cookies.get("refresh_token")

    # Log out session A specifically.
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    resp = client.post("/api/auth/logout", headers=csrf_headers(tok_a))
    assert resp.status_code == 200

    row_a = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(cookie_a)).first()
    row_b = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(cookie_b)).first()
    assert row_a.revoked_at is not None
    assert row_b.revoked_at is None

    # Session B still works.
    client.cookies.set("refresh_token", cookie_b, path="/api/auth")
    resp_b = client.post("/api/auth/refresh", headers=csrf_headers(tok_b))
    assert resp_b.status_code == 200
