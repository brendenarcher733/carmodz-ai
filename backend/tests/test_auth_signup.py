# tests/test_auth_signup.py

from conftest import make_user


def test_signup_is_closed(client):
    """Registration is currently disabled — the endpoint should refuse any
    payload outright rather than create an account."""
    resp = client.post("/api/auth/signup", json={
        "name": "Ada Lovelace", "email": "ada@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 403


def test_signup_is_closed_even_for_an_existing_email(client, db):
    make_user(db, email="taken@example.com")
    resp = client.post("/api/auth/signup", json={
        "name": "Someone Else", "email": "taken@example.com", "password": "CorrectHorse9",
    })
    assert resp.status_code == 403
