# services/posthog_query_service.py
# Read side of PostHog for the admin traffic dashboard. core/analytics.py
# only ever writes events (via the client-safe POSTHOG_API_KEY); reading them
# back out for a chart needs a Personal API Key + project ID instead, so this
# is a separate, optional integration — unset credentials means "not
# configured" rather than an error, matching the AI_PROVIDER=mock pattern.

import httpx

from core.config import settings

_TIMEOUT = 15.0


def is_configured() -> bool:
    return bool(settings.posthog_project_id and settings.posthog_personal_api_key)


def _run_hogql(query: str) -> list[dict]:
    url = f"{settings.posthog_api_host}/api/projects/{settings.posthog_project_id}/query/"
    headers = {"Authorization": f"Bearer {settings.posthog_personal_api_key}"}
    body = {"query": {"kind": "HogQLQuery", "query": query}}

    try:
        resp = httpx.post(url, json=body, headers=headers, timeout=_TIMEOUT)
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"PostHog query failed ({e.response.status_code}): {e.response.text[:300]}") from e
    except httpx.HTTPError as e:
        raise RuntimeError(f"Could not reach PostHog: {e}") from e

    data = resp.json()
    columns = data.get("columns") or []
    return [dict(zip(columns, row)) for row in data.get("results") or []]


def get_traffic_summary(days: int) -> dict:
    """Daily page views + unique visitors, period totals, and the top 10
    pages by views — everything the traffic dashboard needs in one call.
    Totals are queried separately from the daily series rather than summed
    from it, since summing daily unique-visitor counts would double-count
    anyone who visited on more than one day."""
    if not is_configured():
        return {"configured": False}

    daily = _run_hogql(f"""
        SELECT toDate(timestamp) AS day, count() AS pageviews, count(DISTINCT distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview' AND timestamp >= now() - INTERVAL {days} DAY
        GROUP BY day
        ORDER BY day
    """)

    totals_rows = _run_hogql(f"""
        SELECT count() AS pageviews, count(DISTINCT distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview' AND timestamp >= now() - INTERVAL {days} DAY
    """)

    top_pages = _run_hogql(f"""
        SELECT properties.path AS path, count() AS views
        FROM events
        WHERE event = '$pageview' AND timestamp >= now() - INTERVAL {days} DAY AND properties.path IS NOT NULL
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
    """)

    return {
        "configured": True,
        "days": days,
        "totals": totals_rows[0] if totals_rows else {"pageviews": 0, "visitors": 0},
        "daily": [{"day": str(row["day"]), "pageviews": row["pageviews"], "visitors": row["visitors"]} for row in daily],
        "top_pages": top_pages,
    }
