# tests/test_auth_csrf.py
#
# CSRF here isn't middleware — it's a plain function (_verify_csrf_header)
# called manually inside /refresh and /logout, checked against a per-session
# hash stored on that session's RefreshToken row. These tests specifically
# probe that it's session-bound (a valid-looking token from a DIFFERENT
# session must fail), not just "any non-empty header."

from conftest import make_user, login, csrf_headers


def test_csrf_correct_token_for_session_passes(client, db):
    make_user(db, email="csrf-ok@example.com", password="CorrectHorse9")
    tok = login(client, "csrf-ok@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/refresh", headers=csrf_headers(tok))
    assert resp.status_code == 200


def test_csrf_token_from_a_different_session_fails(client, db):
    """Proves the check is session-bound — matched against the hash stored
    on the specific RefreshToken row for the presented cookie, not just
    "is this a plausible opaque token we issued to someone, sometime."""
    make_user(db, email="csrf-cross@example.com", password="CorrectHorse9")
    tok_a = login(client, "csrf-cross@example.com", "CorrectHorse9")
    cookie_a = client.cookies.get("refresh_token")
    tok_b = login(client, "csrf-cross@example.com", "CorrectHorse9")  # overwrites cookie with B's

    # Cookie in the jar is B's, but we present A's (valid, just-issued) CSRF token.
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    resp = client.post("/api/auth/refresh", headers=csrf_headers(tok_b))
    assert resp.status_code == 403


def test_csrf_header_missing_entirely_fails(client, db):
    make_user(db, email="csrf-missing@example.com", password="CorrectHorse9")
    login(client, "csrf-missing@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 403


def test_csrf_not_required_for_login_or_signup(client, db):
    """No prior session exists yet at signup/login, so there's nothing to
    check the header against — neither endpoint should ever 403 for a
    missing X-CSRF-Token."""
    make_user(db, email="csrf-none@example.com", password="CorrectHorse9")
    login_resp = client.post("/api/auth/login", json={
        "email": "csrf-none@example.com", "password": "CorrectHorse9",
    })
    assert login_resp.status_code == 200

    signup_resp = client.post("/api/auth/signup", json={
        "name": "New", "email": "csrf-signup@example.com", "password": "CorrectHorse9",
    })
    assert signup_resp.status_code == 201
