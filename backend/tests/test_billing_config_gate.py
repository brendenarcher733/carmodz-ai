# tests/test_billing_config_gate.py
#
# Regression test for a real bug caught during the original billing build:
# the webhook endpoint only ever needs STRIPE_WEBHOOK_SECRET (it verifies a
# signature, it never calls the Stripe API), so it must NOT be gated on the
# same `billing_configured` check (secret_key + price_id_pro) that /checkout
# and /portal use — those three settings are independently either present or
# absent, and each endpoint should only require the ones it actually needs.

from conftest import make_user, login, auth_headers


def test_checkout_503_when_unconfigured(client, db):
    make_user(db, email="gate1@example.com", password="CorrectHorse9")
    tok = login(client, "gate1@example.com", "CorrectHorse9")
    resp = client.post("/api/billing/checkout", headers=auth_headers(tok))
    assert resp.status_code == 503


def test_portal_503_when_unconfigured(client, db):
    make_user(db, email="gate2@example.com", password="CorrectHorse9")
    tok = login(client, "gate2@example.com", "CorrectHorse9")
    resp = client.post("/api/billing/portal", headers=auth_headers(tok))
    assert resp.status_code == 503


def test_webhook_503_when_unconfigured(client):
    resp = client.post("/api/billing/webhook", content=b"{}", headers={"stripe-signature": "irrelevant"})
    assert resp.status_code == 503


def test_webhook_independent_of_checkout_portal_config(client, monkeypatch):
    """Set ONLY the checkout/portal settings (not the webhook secret) and
    confirm the webhook still 503s on its own narrower gate — this is
    exactly the bug that was caught and fixed manually the first time."""
    from core.config import settings
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_price_id_pro", "price_test_fake")
    # stripe_webhook_secret intentionally left unset
    resp = client.post("/api/billing/webhook", content=b"{}", headers={"stripe-signature": "irrelevant"})
    assert resp.status_code == 503


def test_usage_endpoint_works_regardless_of_billing_config(client, db):
    """/usage never touches Stripe at all — it should work with billing
    fully unconfigured."""
    make_user(db, email="gate3@example.com", password="CorrectHorse9")
    tok = login(client, "gate3@example.com", "CorrectHorse9")
    resp = client.get("/api/billing/usage", headers=auth_headers(tok))
    assert resp.status_code == 200
    assert resp.json()["plan"] == "free"
