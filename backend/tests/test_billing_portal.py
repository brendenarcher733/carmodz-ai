# tests/test_billing_portal.py

from unittest.mock import patch, MagicMock
import stripe

from conftest import make_user, login, auth_headers


def test_portal_creates_session_with_correct_params(client, db, configured_billing):
    make_user(db, email="portal@example.com", password="CorrectHorse9", stripe_customer_id="cus_fake_123")
    tok = login(client, "portal@example.com", "CorrectHorse9")

    fake_session = MagicMock(url="https://billing.stripe.com/session/fake_456")
    with patch("stripe.billing_portal.Session.create", return_value=fake_session) as mock_create:
        resp = client.post("/api/billing/portal", headers=auth_headers(tok))

    assert resp.status_code == 200
    assert resp.json() == {"url": "https://billing.stripe.com/session/fake_456"}
    _, kwargs = mock_create.call_args
    assert kwargs["customer"] == "cus_fake_123"
    assert "return_url" in kwargs


def test_portal_without_stripe_customer_id_400(client, db, configured_billing):
    make_user(db, email="portal-none@example.com", password="CorrectHorse9")  # no stripe_customer_id
    tok = login(client, "portal-none@example.com", "CorrectHorse9")
    resp = client.post("/api/billing/portal", headers=auth_headers(tok))
    assert resp.status_code == 400


def test_portal_stripe_error_surfaces_as_502(client, db, configured_billing):
    make_user(db, email="portal-err@example.com", password="CorrectHorse9", stripe_customer_id="cus_fake_789")
    tok = login(client, "portal-err@example.com", "CorrectHorse9")

    with patch("stripe.billing_portal.Session.create", side_effect=stripe.error.StripeError("boom")):
        resp = client.post("/api/billing/portal", headers=auth_headers(tok))

    assert resp.status_code == 502
