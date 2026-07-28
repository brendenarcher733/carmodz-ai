# tests/test_auth_signup.py

from conftest import make_user


def test_signup_success_issues_session(client, captured_tokens):
    resp = client.post("/api/auth/signup", json={
        "name": "Ada Lovelace", "email": "ada@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["csrf_token"]
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["email_verified"] is False
    assert "refresh_token" in resp.cookies
    # A real verification email (the mock transport) was triggered with a token.
    assert len(captured_tokens["verify"]) == 1
    assert captured_tokens["verify"][0][0] == "ada@example.com"


def test_signup_duplicate_email_conflicts(client, db):
    make_user(db, email="taken@example.com")
    resp = client.post("/api/auth/signup", json={
        "name": "Someone Else", "email": "taken@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 409


def test_signup_rejects_all_digit_password(client):
    resp = client.post("/api/auth/signup", json={
        "name": "A", "email": "a@example.com", "password": "12345678",
    })
    assert resp.status_code == 422


def test_signup_rejects_single_repeated_character_password(client):
    resp = client.post("/api/auth/signup", json={
        "name": "A", "email": "b@example.com", "password": "aaaaaaaa",
    })
    assert resp.status_code == 422


def test_signup_rejects_short_password(client):
    resp = client.post("/api/auth/signup", json={
        "name": "A", "email": "c@example.com", "password": "short1",
    })
    assert resp.status_code == 422


def test_signup_rejects_invalid_email(client):
    resp = client.post("/api/auth/signup", json={
        "name": "A", "email": "not-an-email", "password": "CorrectHorse9",
    })
    assert resp.status_code == 422


def test_signup_lowercases_and_strips_email(client):
    resp = client.post("/api/auth/signup", json={
        "name": "A", "email": "  Mixed@Example.COM  ", "password": "CorrectHorse9",
    })
    assert resp.status_code == 201
    assert resp.json()["user"]["email"] == "mixed@example.com"
