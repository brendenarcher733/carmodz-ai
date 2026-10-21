# tests/test_shops_router.py
#
# HTTP-level tests for POST /api/shops/nearby. The default, every-deploy-
# today state (no PLACES_PROVIDER configured) is the most important case
# here: it must come back 200 with status="not_configured", never a fake
# result and never a silent failure.

import pytest

from core.config import settings


@pytest.fixture(autouse=True)
def no_places_provider(monkeypatch):
    """Explicit, not relied-on-by-accident: every test in this file starts
    from the real default state (core/config.py has no PLACES_PROVIDER set
    anywhere in this repo) unless a test overrides it itself."""
    monkeypatch.setattr(settings, "places_provider", "")
    monkeypatch.setattr(settings, "places_api_key", "")


def test_returns_not_configured_by_default(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "not_configured"
    assert body["shops"] == []
    assert body["message"]


def test_not_configured_response_never_contains_invented_shops(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701", "category": "performance"})
    body = resp.json()
    assert body["shops"] == []


def test_rejects_malformed_zip(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "not-a-zip"})
    assert resp.status_code == 422


def test_accepts_zip_plus_four(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701-1234"})
    assert resp.status_code == 200


def test_rejects_missing_zip(client):
    resp = client.post("/api/shops/nearby", json={})
    assert resp.status_code == 422


def test_rejects_unknown_category(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701", "category": "not-a-real-category"})
    assert resp.status_code == 422


def test_category_is_optional(client):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701"})
    assert resp.status_code == 200


def test_works_without_authorization_header(client):
    """Same anonymous-reachable precedent as /api/guides/ and
    /api/plans/preview — not user-specific, no auth required."""
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701"})
    assert resp.status_code == 200


@pytest.mark.parametrize("category", ["performance", "handling", "sound", "cosmetic", "reliability", "interior"])
def test_handles_every_recommendation_category(client, category):
    resp = client.post("/api/shops/nearby", json={"zip_code": "62701", "category": category})
    assert resp.status_code == 200
    assert resp.json()["status"] == "not_configured"


def test_rejects_arbitrary_extra_fields():
    """extra='forbid' on NearbyShopsRequest — mirrors models.guide.GuideRequest's
    own contract, so a client can't smuggle unexpected fields through."""
    from pydantic import ValidationError
    from models.shop import NearbyShopsRequest
    with pytest.raises(ValidationError):
        NearbyShopsRequest(zip_code="62701", latitude=37.77, longitude=-122.42)
