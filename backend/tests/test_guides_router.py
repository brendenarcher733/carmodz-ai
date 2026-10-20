# tests/test_guides_router.py
#
# HTTP-level tests for POST /api/guides/ — public, stateless, no DB
# involved. See tests/test_guide_service.py for the generation-logic tests.

import pytest

from core.config import settings

PAYLOAD = {
    "name": "Cold Air Intake", "category": "performance", "difficulty": "easy",
    "suggested_search_terms": ["K&N cold air intake"],
    "year": 2018, "make": "Honda", "model": "Civic Si",
}


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    """Same convention as tests/test_plans_preview.py — backend/.env carries
    a real ANTHROPIC_API_KEY; blank it so these tests exercise the local
    fallback and never make a paid call."""
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")


def test_create_install_guide_returns_200_with_expected_shape(client):
    resp = client.post("/api/guides/", json=PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["difficulty"] == "easy"
    assert 1 <= len(body["steps"]) <= 5
    assert isinstance(body["tools"], list)
    assert isinstance(body["parts_to_confirm"], list)
    assert body["parts_search_url"].startswith("https://www.google.com/search?q=")
    assert body["video_search_url"].startswith("https://www.youtube.com/results?search_query=")
    assert body["docs_search_url"].startswith("https://www.google.com/search?q=")


def test_create_install_guide_works_without_authorization_header(client):
    """No Authorization header sent at all — confirms the anonymous-preview
    path can use this just as freely as a signed-in user."""
    resp = client.post("/api/guides/", json=PAYLOAD)
    assert resp.status_code == 200


def test_create_install_guide_rejects_missing_fields(client):
    resp = client.post("/api/guides/", json={"name": "Cold Air Intake"})
    assert resp.status_code == 422


def test_create_install_guide_rejects_unknown_category(client):
    bad = {**PAYLOAD, "category": "not-a-real-category"}
    resp = client.post("/api/guides/", json=bad)
    assert resp.status_code == 422


def test_create_install_guide_rejects_unknown_difficulty(client):
    bad = {**PAYLOAD, "difficulty": "impossible"}
    resp = client.post("/api/guides/", json=bad)
    assert resp.status_code == 422


def test_create_install_guide_rejects_year_out_of_bounds(client):
    bad = {**PAYLOAD, "year": 1800}
    resp = client.post("/api/guides/", json=bad)
    assert resp.status_code == 422


def test_create_install_guide_does_not_require_a_build_or_recommendation_id(client):
    """Core design point: nothing is looked up from the database — a
    payload built entirely from fields the frontend already has in memory
    is sufficient on its own."""
    resp = client.post("/api/guides/", json=PAYLOAD)
    assert resp.status_code == 200


@pytest.mark.parametrize("category", ["performance", "handling", "sound", "cosmetic", "reliability", "interior"])
def test_create_install_guide_handles_every_category(client, category):
    payload = {**PAYLOAD, "category": category}
    resp = client.post("/api/guides/", json=payload)
    assert resp.status_code == 200
    assert len(resp.json()["tools"]) > 0


def test_create_install_guide_response_never_exceeds_five_steps(client):
    resp = client.post("/api/guides/", json=PAYLOAD)
    assert len(resp.json()["steps"]) <= 5


def test_create_install_guide_does_not_echo_back_an_arbitrary_url_field(client):
    """The request has no URL field at all for the model to echo — the three
    search URLs in the response are only ever the three deterministic ones
    this service computes (services/guide_service.build_search_links)."""
    resp = client.post("/api/guides/", json=PAYLOAD)
    body = resp.json()
    allowed_url_keys = {"parts_search_url", "video_search_url", "docs_search_url"}
    url_keys = {k for k, v in body.items() if isinstance(v, str) and v.startswith("http")}
    assert url_keys == allowed_url_keys
