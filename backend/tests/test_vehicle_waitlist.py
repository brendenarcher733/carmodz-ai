# tests/test_vehicle_waitlist.py
#
# POST /api/vehicles/waitlist — "my vehicle isn't listed" capture. Plain
# lead capture: no plan generated, no email sent, no account.

import redis

from core.config import settings
from models.vehicle_waitlist import VehicleWaitlistCapture

PAYLOAD = {"email": "driver@example.com", "make": "Yugo", "model": "GV"}


def test_waitlist_returns_200_with_an_id(client):
    resp = client.post("/api/vehicles/waitlist", json=PAYLOAD)
    assert resp.status_code == 200
    assert isinstance(resp.json()["id"], int)


def test_waitlist_persists_a_capture_row(client, db):
    client.post("/api/vehicles/waitlist", json=PAYLOAD)
    row = db.query(VehicleWaitlistCapture).order_by(VehicleWaitlistCapture.id.desc()).first()
    assert row is not None
    assert row.email == "driver@example.com"
    assert row.make == "Yugo" and row.model == "GV"


def test_waitlist_normalizes_email_and_trims_vehicle_text(client, db):
    resp = client.post("/api/vehicles/waitlist", json={
        "email": "  Driver@Example.com  ", "make": "  Yugo  ", "model": "  GV  ",
    })
    row = db.query(VehicleWaitlistCapture).filter_by(id=resp.json()["id"]).first()
    assert row.email == "driver@example.com"
    assert row.make == "Yugo" and row.model == "GV"


def test_waitlist_rejects_malformed_email(client):
    resp = client.post("/api/vehicles/waitlist", json={**PAYLOAD, "email": "not-an-email"})
    assert resp.status_code == 422


def test_waitlist_rejects_missing_make_or_model(client):
    assert client.post("/api/vehicles/waitlist", json={"email": "driver@example.com", "model": "GV"}).status_code == 422
    assert client.post("/api/vehicles/waitlist", json={"email": "driver@example.com", "make": "Yugo"}).status_code == 422


def test_waitlist_rejects_arbitrary_extra_fields(client):
    resp = client.post("/api/vehicles/waitlist", json={**PAYLOAD, "year": 1986})
    assert resp.status_code == 422


def test_waitlist_does_not_require_authorization_header(client):
    resp = client.post("/api/vehicles/waitlist", json=PAYLOAD)
    assert resp.status_code == 200


def test_waitlist_never_sends_an_email(client, monkeypatch):
    """"We'll notify you when we add it" is a future, manual action —
    nothing here should call the email transport at submission time."""
    called = []
    monkeypatch.setattr("core.email.send_email", lambda *a, **kw: called.append(True))
    client.post("/api/vehicles/waitlist", json=PAYLOAD)
    assert called == []


def _clear_waitlist_rate_limit():
    r = redis.Redis.from_url(settings.redis_url)
    for key in r.scan_iter("ratelimit:vehicle_waitlist:*"):
        r.delete(key)


def test_waitlist_rate_limited_after_ten_requests(raw_client):
    _clear_waitlist_rate_limit()
    try:
        last_resp = None
        for _ in range(11):   # cap is 10 per 600s (routers/vehicles.py's waitlist_rate_limit)
            last_resp = raw_client.post("/api/vehicles/waitlist", json=PAYLOAD)
        assert last_resp.status_code == 429
        assert "Retry-After" in last_resp.headers
    finally:
        _clear_waitlist_rate_limit()
