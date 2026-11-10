# tests/test_auth_signup.py

from conftest import make_user
from models.user import User


def test_signup_creates_account_and_returns_session(client, db):
    resp = client.post("/api/auth/signup", json={
        "name": "Ada Lovelace", "email": "ada@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["access_token"]
    assert body["csrf_token"]
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    assert "refresh_token" in resp.cookies

    user = db.query(User).filter(User.email == "ada@example.com").first()
    assert user is not None
    assert user.password_hash != "CorrectHorse9"  # stored hashed, not plaintext


def test_signup_rejects_duplicate_email(client, db):
    make_user(db, email="taken@example.com")
    resp = client.post("/api/auth/signup", json={
        "name": "Someone Else", "email": "taken@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 409


def test_signup_rejects_short_password(client):
    resp = client.post("/api/auth/signup", json={
        "name": "Ada Lovelace", "email": "ada2@example.com", "password": "short",
    })
    assert resp.status_code == 422
