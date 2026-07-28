# tests/test_auth_login.py

from conftest import make_user
from core.config import settings


def test_login_success(client, db):
    make_user(db, email="login@example.com", password="CorrectHorse9")
    resp = client.post("/api/auth/login", json={"email": "login@example.com", "password": "CorrectHorse9"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["csrf_token"]
    assert body["user"]["email"] == "login@example.com"
    assert "refresh_token" in resp.cookies


def test_login_wrong_password(client, db):
    make_user(db, email="login2@example.com", password="CorrectHorse9")
    resp = client.post("/api/auth/login", json={"email": "login2@example.com", "password": "WrongPassword1"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert resp.status_code == 401


def test_login_inactive_account(client, db):
    make_user(db, email="inactive@example.com", password="CorrectHorse9", is_active=False)
    resp = client.post("/api/auth/login", json={"email": "inactive@example.com", "password": "CorrectHorse9"})
    assert resp.status_code == 403


def test_login_unverified_blocked_when_required(client, db, monkeypatch):
    monkeypatch.setattr(settings, "require_email_verification_to_login", True)
    make_user(db, email="unverified@example.com", password="CorrectHorse9", email_verified=False)
    resp = client.post("/api/auth/login", json={"email": "unverified@example.com", "password": "CorrectHorse9"})
    assert resp.status_code == 403


def test_login_unverified_allowed_by_default(client, db):
    # require_email_verification_to_login defaults to False.
    make_user(db, email="unverified2@example.com", password="CorrectHorse9", email_verified=False)
    resp = client.post("/api/auth/login", json={"email": "unverified2@example.com", "password": "CorrectHorse9"})
    assert resp.status_code == 200


def test_login_updates_last_login_at(client, db):
    user = make_user(db, email="returning@example.com", password="CorrectHorse9")
    assert user.last_login_at is None
    client.post("/api/auth/login", json={"email": "returning@example.com", "password": "CorrectHorse9"})
    db.refresh(user)
    assert user.last_login_at is not None
