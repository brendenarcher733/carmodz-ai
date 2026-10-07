# tests/test_plans_preview.py

import pytest

from core.config import settings
from models.build import Build

PAYLOAD = {
    "title": "2018 Honda Civic Si", "year": 2018, "make": "Honda", "model": "Civic Si",
    "budget": 2500, "goal": "Fun Daily Driver", "experience": "intermediate",
    "categories": ["performance", "handling"], "is_daily": True, "notes": "",
}


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    """backend/.env carries a real ANTHROPIC_API_KEY, which settings loads even
    under pytest. Blank the keys so these tests exercise the mock path and
    never make a paid model call."""
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")


def test_preview_returns_a_plan_without_auth(client, db):
    resp = client.post("/api/plans/preview", json=PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["year"] == 2018 and body["make"] == "Honda"
    assert len(body["mods"]) > 0
    assert body["used_mock_fallback"] is True  # no AI key configured in tests


def test_preview_saves_nothing(client, db):
    client.post("/api/plans/preview", json=PAYLOAD)
    assert db.query(Build).count() == 0


def test_preview_rejects_incomplete_input(client):
    resp = client.post("/api/plans/preview", json={"make": "Honda"})
    assert resp.status_code == 422
