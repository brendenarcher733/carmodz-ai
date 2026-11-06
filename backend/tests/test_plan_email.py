# tests/test_plan_email.py
#
# POST /api/plans/email — "email me this plan" lead capture. No account
# involved; covers the DB capture (email/year/make/model/full snapshot)
# and that the plain-text email actually sent is built from the real plan
# content, not a stub.

import redis

from core.config import settings
from models.plan_email import PlanEmailCapture

MOD = {
    "name": "Cold Air Intake", "category": "performance",
    "price_min": 150, "price_max": 300, "difficulty": "easy", "stage": 1, "priority": 1,
    "why": "Improves throttle response and airflow.",
    "impact": "More power.", "compatibility_note": "", "tradeoff": "",
    "suggested_search_terms": ["K&N cold air intake"],
    "fitment_status": "unknown", "fitment_reason": None, "fitment_source": None,
}

PLAN = {
    "build_id": 0, "title": "2018 Honda Civic Si", "year": 2018, "make": "Honda", "model": "Civic Si",
    "goal": "Fun Daily Driver", "budget": 2500.0, "mods": [MOD],
    "total_min": 150.0, "total_max": 300.0, "budget_remaining": 2275.0, "budget_warning": None,
    "summary": "A solid first step for your Civic Si.",
    "stage_breakdown": {"Stage 1": ["Cold Air Intake"]},
    "used_mock_fallback": True, "vehicle_verified": False,
}

PAYLOAD = {"email": "driver@example.com", "plan": PLAN}


def test_email_plan_returns_200_with_an_id(client):
    resp = client.post("/api/plans/email", json=PAYLOAD)
    assert resp.status_code == 200
    assert isinstance(resp.json()["id"], int)


def test_email_plan_persists_a_capture_row(client, db):
    client.post("/api/plans/email", json=PAYLOAD)
    row = db.query(PlanEmailCapture).order_by(PlanEmailCapture.id.desc()).first()
    assert row is not None
    assert row.email == "driver@example.com"
    assert row.year == 2018 and row.make == "Honda" and row.model == "Civic Si"
    assert row.plan_snapshot["mods"][0]["name"] == "Cold Air Intake"


def test_email_plan_normalizes_email_case_and_whitespace(client, db):
    resp = client.post("/api/plans/email", json={**PAYLOAD, "email": "  Driver@Example.com  "})
    assert resp.status_code == 200
    row = db.query(PlanEmailCapture).filter_by(id=resp.json()["id"]).first()
    assert row.email == "driver@example.com"


def test_email_plan_rejects_malformed_email(client):
    resp = client.post("/api/plans/email", json={**PAYLOAD, "email": "not-an-email"})
    assert resp.status_code == 422


def test_email_plan_rejects_missing_plan(client):
    resp = client.post("/api/plans/email", json={"email": "driver@example.com"})
    assert resp.status_code == 422


def test_email_plan_sends_mail_built_from_real_plan_content(client, monkeypatch):
    sent = {}

    def fake_send_email(to, subject, text, html=None):
        sent["to"] = to
        sent["subject"] = subject
        sent["text"] = text

    monkeypatch.setattr("services.plan_email_service.send_email", fake_send_email)

    resp = client.post("/api/plans/email", json=PAYLOAD)
    assert resp.status_code == 200
    assert sent["to"] == "driver@example.com"
    assert "2018 Honda Civic Si" in sent["subject"]
    assert "Cold Air Intake" in sent["text"]
    assert "$150" in sent["text"]


def test_email_plan_does_not_require_authorization_header(client):
    resp = client.post("/api/plans/email", json=PAYLOAD)
    assert resp.status_code == 200


def _clear_email_plan_rate_limit():
    """Same reasoning as test_auth_rate_limiting.py's own helper: every
    call in this file shares one IP-keyed Redis counter
    (`ratelimit:email_plan:<ip>`), so it's cleared explicitly rather than
    relying on the 600s TTL between test runs."""
    r = redis.Redis.from_url(settings.redis_url)
    for key in r.scan_iter("ratelimit:email_plan:*"):
        r.delete(key)


def test_email_plan_rate_limited_after_five_requests(raw_client):
    """raw_client has the real Redis-backed limiter active, unlike the
    default client fixture (see conftest.py)."""
    _clear_email_plan_rate_limit()
    try:
        last_resp = None
        for _ in range(6):   # cap is 5 per 600s (routers/plans.py's email_plan_rate_limit)
            last_resp = raw_client.post("/api/plans/email", json=PAYLOAD)
        assert last_resp.status_code == 429
        assert "Retry-After" in last_resp.headers
    finally:
        _clear_email_plan_rate_limit()
