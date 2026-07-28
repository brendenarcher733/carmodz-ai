# tests/test_auth_refresh.py

from conftest import make_user, login, csrf_headers
from models.user import RefreshToken


def test_refresh_success_rotates_token(client, db):
    make_user(db, email="refresh@example.com", password="CorrectHorse9")
    tok = login(client, "refresh@example.com", "CorrectHorse9")
    old_cookie = client.cookies.get("refresh_token")

    resp = client.post("/api/auth/refresh", headers=csrf_headers(tok))
    assert resp.status_code == 200
    new_tok = resp.json()
    # Note: access_token is NOT asserted to differ from the pre-refresh one —
    # it's a second-resolution {sub, exp, iat} HMAC payload with no nonce, so
    # two issued for the same user within the same wall-clock second are
    # legitimately byte-identical. That's not a flaw; what actually rotates
    # on every /refresh is the session itself (cookie + CSRF token below).
    assert new_tok["csrf_token"] != tok["csrf_token"]

    new_cookie = client.cookies.get("refresh_token")
    assert new_cookie != old_cookie

    # The old row is now revoked.
    from core.security import hash_opaque_token
    old_row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_opaque_token(old_cookie)).first()
    assert old_row.revoked_at is not None


def test_refresh_missing_cookie_401(client):
    resp = client.post("/api/auth/refresh", headers={"X-CSRF-Token": "irrelevant"})
    assert resp.status_code == 401


def test_refresh_garbage_cookie_401(client):
    client.cookies.set("refresh_token", "not-a-real-token", path="/api/auth")
    resp = client.post("/api/auth/refresh", headers={"X-CSRF-Token": "irrelevant"})
    assert resp.status_code == 401


def test_refresh_missing_csrf_header_403(client, db):
    make_user(db, email="csrf1@example.com", password="CorrectHorse9")
    login(client, "csrf1@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 403


def test_refresh_wrong_csrf_header_403(client, db):
    make_user(db, email="csrf2@example.com", password="CorrectHorse9")
    login(client, "csrf2@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/refresh", headers={"X-CSRF-Token": "totally-wrong"})
    assert resp.status_code == 403


def test_refresh_reuse_of_rotated_token_kills_all_sessions(client, db):
    """The theft-response path: presenting an already-rotated refresh token
    doesn't just fail — it revokes every other live session for that user.

    Two "devices" simulated on one TestClient/cookie-jar by manually
    swapping which refresh-token cookie value is active before each call
    (rather than a second TestClient — a second `TestClient(main.app)`
    would run a second, nested lifespan on the same shared `app` singleton,
    whose teardown would close the Redis pool out from under this test)."""
    make_user(db, email="theft@example.com", password="CorrectHorse9")

    tok_a = login(client, "theft@example.com", "CorrectHorse9")
    cookie_a = client.cookies.get("refresh_token")

    tok_b = login(client, "theft@example.com", "CorrectHorse9")
    cookie_b = client.cookies.get("refresh_token")

    # Rotate A forward once (legitimate use) — jar currently holds B's
    # cookie, so make A's active again first.
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    r1 = client.post("/api/auth/refresh", headers=csrf_headers(tok_a))
    assert r1.status_code == 200

    # Replay the OLD (already-rotated-away) cookie for A — simulated theft
    # of a stale token.
    client.cookies.set("refresh_token", cookie_a, path="/api/auth")
    r2 = client.post("/api/auth/refresh", headers=csrf_headers(tok_a))
    assert r2.status_code == 401

    # Session B — a completely separate session for the same user — should
    # now be dead too.
    client.cookies.set("refresh_token", cookie_b, path="/api/auth")
    resp_b = client.post("/api/auth/refresh", headers=csrf_headers(tok_b))
    assert resp_b.status_code == 401
