# tests/test_billing_webhook.py
#
# Constructs genuine HMAC-signed synthetic Stripe events (Stripe's real
# signing scheme is public and reproducible: HMAC-SHA256 over
# "{timestamp}.{payload}") — the same technique already used manually via a
# Python shell to verify this webhook end-to-end during the original billing
# build, now codified so it runs on every PR instead of once by hand.

from conftest import make_user, sign_stripe_payload, stripe_event


WEBHOOK_SECRET = "whsec_test_fake"


def _post_event(client, event: dict, secret: str = WEBHOOK_SECRET):
    body, sig_header = sign_stripe_payload(event, secret)
    return client.post(
        "/api/billing/webhook",
        content=body,
        headers={"stripe-signature": sig_header, "Content-Type": "application/json"},
    )


def test_checkout_session_completed_upgrades_user_to_pro(client, db, configured_billing):
    user = make_user(db, email="webhook1@example.com", password="CorrectHorse9")
    assert user.plan == "free"

    event = stripe_event("checkout.session.completed", {
        "client_reference_id": str(user.id),
        "customer": "cus_new_123",
        "subscription": "sub_new_456",
    })
    resp = _post_event(client, event)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    db.refresh(user)
    assert user.plan == "pro"
    assert user.stripe_customer_id == "cus_new_123"
    assert user.stripe_subscription_id == "sub_new_456"


def test_checkout_session_completed_unknown_user_is_ignored_not_error(client, configured_billing):
    event = stripe_event("checkout.session.completed", {
        "client_reference_id": "999999", "customer": "cus_x", "subscription": "sub_x",
    })
    resp = _post_event(client, event)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored"}


def test_subscription_updated_active_sets_pro(client, db, configured_billing):
    user = make_user(db, email="webhook2@example.com", password="CorrectHorse9",
                      stripe_customer_id="cus_active_1", plan="free")
    event = stripe_event("customer.subscription.updated", {
        "customer": "cus_active_1", "status": "active", "cancel_at": None,
    })
    resp = _post_event(client, event)
    assert resp.status_code == 200
    db.refresh(user)
    assert user.plan == "pro"
    assert user.subscription_cancel_at is None


def test_subscription_updated_canceled_sets_free(client, db, configured_billing):
    user = make_user(db, email="webhook3@example.com", password="CorrectHorse9",
                      stripe_customer_id="cus_canceled_1", plan="pro")
    event = stripe_event("customer.subscription.updated", {
        "customer": "cus_canceled_1", "status": "canceled", "cancel_at": None,
    })
    resp = _post_event(client, event)
    assert resp.status_code == 200
    db.refresh(user)
    assert user.plan == "free"


def test_subscription_updated_syncs_cancel_at_date(client, db, configured_billing):
    import datetime
    epoch = int(datetime.datetime(2026, 12, 1, tzinfo=datetime.timezone.utc).timestamp())
    user = make_user(db, email="webhook4@example.com", password="CorrectHorse9",
                      stripe_customer_id="cus_cancel_at_1", plan="pro")
    event = stripe_event("customer.subscription.updated", {
        "customer": "cus_cancel_at_1", "status": "active", "cancel_at": epoch,
    })
    _post_event(client, event)
    db.refresh(user)
    assert user.subscription_cancel_at is not None
    assert user.subscription_cancel_at.year == 2026
    assert user.subscription_cancel_at.month == 12


def test_subscription_deleted_reverts_to_free(client, db, configured_billing):
    user = make_user(db, email="webhook5@example.com", password="CorrectHorse9",
                      stripe_customer_id="cus_del_1", stripe_subscription_id="sub_del_1", plan="pro")
    event = stripe_event("customer.subscription.deleted", {"customer": "cus_del_1"})
    resp = _post_event(client, event)
    assert resp.status_code == 200
    db.refresh(user)
    assert user.plan == "free"
    assert user.stripe_subscription_id is None


def test_subscription_updated_unknown_customer_is_ignored(client, configured_billing):
    event = stripe_event("customer.subscription.updated", {"customer": "cus_unknown", "status": "active"})
    resp = _post_event(client, event)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored"}


def test_invalid_signature_rejected(client, configured_billing):
    event = stripe_event("checkout.session.completed", {"client_reference_id": "1"})
    body, _ = sign_stripe_payload(event, "wrong-secret-entirely")
    resp = client.post(
        "/api/billing/webhook",
        content=body,
        headers={"stripe-signature": "t=1,v1=deadbeef", "Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_missing_signature_header_rejected(client, configured_billing):
    resp = client.post("/api/billing/webhook", content=b'{"type": "checkout.session.completed"}')
    assert resp.status_code == 400


def test_unhandled_event_type_returns_ok_without_error(client, configured_billing):
    """Any event type not explicitly handled just falls through to the
    default {"status": "ok"} — confirms unrecognized/future Stripe event
    types can't crash the endpoint."""
    event = stripe_event("customer.updated", {"id": "cus_whatever"})
    resp = _post_event(client, event)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
