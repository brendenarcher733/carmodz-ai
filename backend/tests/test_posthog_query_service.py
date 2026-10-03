# tests/test_posthog_query_service.py

import httpx
import pytest

from core.config import settings
from services import posthog_query_service as svc


@pytest.fixture
def configured_posthog(monkeypatch):
    monkeypatch.setattr(settings, "posthog_project_id", "12345")
    monkeypatch.setattr(settings, "posthog_personal_api_key", "phx_fake")
    monkeypatch.setattr(settings, "posthog_api_host", "https://us.posthog.com")
    return settings


def test_not_configured_short_circuits(monkeypatch):
    monkeypatch.setattr(settings, "posthog_project_id", "")
    monkeypatch.setattr(settings, "posthog_personal_api_key", "")
    assert svc.get_traffic_summary(30) == {"configured": False}


def test_traffic_summary_shapes_the_three_queries(monkeypatch, configured_posthog):
    """One fake transport answers all three HogQL calls in sequence (daily,
    totals, top pages) — asserts each request hit the right project/host
    with the personal API key, and that rows get zipped against `columns`
    correctly."""
    calls = []

    responses = [
        {"columns": ["day", "pageviews", "visitors"], "results": [["2026-09-01", 10, 4], ["2026-09-02", 15, 6]]},
        {"columns": ["pageviews", "visitors"], "results": [[25, 9]]},
        {"columns": ["path", "views"], "results": [["/", 18], ["/planner", 7]]},
    ]

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append((url, headers))
        return httpx.Response(200, json=responses[len(calls) - 1], request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    result = svc.get_traffic_summary(30)

    assert result["configured"] is True
    assert result["days"] == 30
    assert result["totals"] == {"pageviews": 25, "visitors": 9}
    assert result["daily"] == [
        {"day": "2026-09-01", "pageviews": 10, "visitors": 4},
        {"day": "2026-09-02", "pageviews": 15, "visitors": 6},
    ]
    assert result["top_pages"] == [{"path": "/", "views": 18}, {"path": "/planner", "views": 7}]

    assert len(calls) == 3
    for url, headers in calls:
        assert url == "https://us.posthog.com/api/projects/12345/query/"
        assert headers["Authorization"] == "Bearer phx_fake"


def test_query_error_raises_runtime_error(monkeypatch, configured_posthog):
    def fake_post(url, json=None, headers=None, timeout=None):
        return httpx.Response(401, text="invalid API key", request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    with pytest.raises(RuntimeError, match="401"):
        svc.get_traffic_summary(30)
