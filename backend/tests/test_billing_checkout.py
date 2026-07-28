# tests/test_billing_checkout.py

from unittest.mock import patch, MagicMock
import stripe

from conftest import make_user, login, auth_headers


def test_checkout_creates_session_with_correct_params(client, db, configured_billing):
    user = make_user(db, email="checkout@example.com", password="CorrectHorse9")
    tok = login(client, "checkout@example.com", "CorrectHorse9")

    fake_session = MagicMock(url="https://checkout.stripe.com/pay/fake_session_123")
    with patch("stripe.checkout.Session.create", return_value=fake_session) as mock_create:
        resp = client.post("/api/billing/checkout", headers=auth_headers(tok))

    assert resp.status_code == 200
    assert resp.json() == {"url": "https://checkout.stripe.com/pay/fake_session_123"}

    _, kwargs = mock_create.call_args
    assert kwargs["mode"] == "subscription"
    assert kwargs["client_reference_id"] == str(user.id)
    assert kwargs["customer_email"] == "checkout@example.com"
    assert kwargs["line_items"] == [{"price": "price_test_fake", "quantity": 1}]
    assert "success_url" in kwargs and "cancel_url" in kwargs


def test_checkout_stripe_error_surfaces_as_502(client, db, configured_billing):
    make_user(db, email="checkout-err@example.com", password="CorrectHorse9")
    tok = login(client, "checkout-err@example.com", "CorrectHorse9")

    with patch("stripe.checkout.Session.create", side_effect=stripe.error.StripeError("boom")):
        resp = client.post("/api/billing/checkout", headers=auth_headers(tok))

    assert resp.status_code == 502


def test_checkout_requires_auth(client, configured_billing):
    resp = client.post("/api/billing/checkout")
    assert resp.status_code == 401
