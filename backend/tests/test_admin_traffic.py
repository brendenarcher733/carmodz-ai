# tests/test_admin_traffic.py

from conftest import make_user, login, auth_headers


def test_traffic_requires_admin(client, db):
    make_user(db, email="user@example.com", is_admin=False)
    tok = login(client, "user@example.com", "CorrectHorse9")
    resp = client.get("/api/admin/analytics/traffic", headers=auth_headers(tok))
    assert resp.status_code == 403


def test_traffic_reports_not_configured_by_default(client, db):
    """No POSTHOG_PROJECT_ID/POSTHOG_PERSONAL_API_KEY is set in the test
    env — the endpoint should report that cleanly rather than erroring."""
    make_user(db, email="admin@example.com", is_admin=True)
    tok = login(client, "admin@example.com", "CorrectHorse9")
    resp = client.get("/api/admin/analytics/traffic", headers=auth_headers(tok))
    assert resp.status_code == 200
    assert resp.json() == {"configured": False, "days": None, "totals": None, "daily": [], "top_pages": []}


def test_traffic_days_param_is_bounded(client, db):
    make_user(db, email="admin2@example.com", is_admin=True)
    tok = login(client, "admin2@example.com", "CorrectHorse9")
    resp = client.get("/api/admin/analytics/traffic?days=9999", headers=auth_headers(tok))
    assert resp.status_code == 422
