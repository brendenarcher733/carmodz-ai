# tests/test_auth_password_reset.py

from conftest import make_user, login


def test_forgot_password_identical_response_existing_vs_unknown_email(client, db):
    """Anti-enumeration: the response must be byte-identical whether or not
    the account exists — a distinct "no such account" message would let an
    attacker enumerate registered emails one guess at a time."""
    make_user(db, email="exists@example.com", password="CorrectHorse9")

    resp_existing = client.post("/api/auth/forgot-password", json={"email": "exists@example.com"})
    resp_unknown = client.post("/api/auth/forgot-password", json={"email": "nobody-here@example.com"})

    assert resp_existing.status_code == resp_unknown.status_code == 200
    assert resp_existing.json() == resp_unknown.json()


def test_forgot_password_only_emails_active_accounts(client, db, captured_tokens):
    make_user(db, email="disabled@example.com", password="CorrectHorse9", is_active=False)
    resp = client.post("/api/auth/forgot-password", json={"email": "disabled@example.com"})
    assert resp.status_code == 200
    assert captured_tokens["reset"] == []  # no email actually sent for a disabled account


def test_reset_password_success_and_can_login_with_new_password(client, db, captured_tokens):
    make_user(db, email="reset@example.com", password="OldPassword9")
    client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    raw_token = captured_tokens["reset"][0][1]

    resp = client.post("/api/auth/reset-password", json={
        "token": raw_token, "new_password": "NewPassword9",
    })
    assert resp.status_code == 200

    old_login = client.post("/api/auth/login", json={"email": "reset@example.com", "password": "OldPassword9"})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", json={"email": "reset@example.com", "password": "NewPassword9"})
    assert new_login.status_code == 200


def test_reset_password_token_is_single_use(client, db, captured_tokens):
    make_user(db, email="reuse-reset@example.com", password="OldPassword9")
    client.post("/api/auth/forgot-password", json={"email": "reuse-reset@example.com"})
    raw_token = captured_tokens["reset"][0][1]

    first = client.post("/api/auth/reset-password", json={"token": raw_token, "new_password": "NewPassword9"})
    assert first.status_code == 200

    second = client.post("/api/auth/reset-password", json={"token": raw_token, "new_password": "AnotherPass9"})
    assert second.status_code == 400


def test_reset_password_garbage_token_400(client):
    resp = client.post("/api/auth/reset-password", json={"token": "not-a-real-token", "new_password": "NewPassword9"})
    assert resp.status_code == 400


def test_verify_email_success(client, db, captured_tokens):
    user = make_user(db, email="verify@example.com", password="CorrectHorse9", email_verified=False)
    tok = login(client, "verify@example.com", "CorrectHorse9")
    client.post("/api/auth/resend-verification", headers={"Authorization": f"Bearer {tok['access_token']}"})
    raw_token = captured_tokens["verify"][-1][1]

    resp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert resp.status_code == 200
    db.refresh(user)
    assert user.email_verified is True


def test_verify_email_garbage_token_400(client):
    resp = client.post("/api/auth/verify-email", json={"token": "garbage"})
    assert resp.status_code == 400


def test_resend_verification_short_circuits_when_already_verified(client, db, captured_tokens):
    make_user(db, email="already-verified@example.com", password="CorrectHorse9", email_verified=True)
    tok = login(client, "already-verified@example.com", "CorrectHorse9")
    resp = client.post("/api/auth/resend-verification", headers={"Authorization": f"Bearer {tok['access_token']}"})
    assert resp.status_code == 200
    assert resp.json() == {"detail": "Email already verified"}
    assert captured_tokens["verify"] == []  # no new email sent
