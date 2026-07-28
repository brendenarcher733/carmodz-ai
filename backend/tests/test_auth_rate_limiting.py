# tests/test_auth_rate_limiting.py
#
# The one file in this suite that deliberately does NOT disable rate
# limiting (see `raw_client` vs `client` in conftest.py) — everywhere else,
# rate limiting is noise the tests need to route around; here, it's the
# thing actually being tested. Real Redis-backed (core/rate_limit.py),
# keyed by client IP — TestClient requests all share one fake IP, which is
# exactly what makes them collide into the same rate-limit window here.

import redis
from core.config import settings


def _clear_login_rate_limit():
    """Every test in this file shares the same IP-keyed Redis counter
    (`ratelimit:login:<ip>`), so a fresh module-level login_rate_limit
    window is needed per test rather than relying on the 300s TTL to expire
    between test runs."""
    r = redis.Redis.from_url(settings.redis_url)
    for key in r.scan_iter("ratelimit:login:*"):
        r.delete(key)


def test_login_rate_limit_returns_429_with_retry_after(raw_client, db):
    _clear_login_rate_limit()
    from conftest import make_user
    make_user(db, email="ratelimited@example.com", password="CorrectHorse9")

    last_resp = None
    for _ in range(11):  # cap is 10 per 300s (routers/auth.py's login_rate_limit)
        last_resp = raw_client.post("/api/auth/login", json={
            "email": "ratelimited@example.com", "password": "wrong-password",
        })

    assert last_resp.status_code == 429
    assert "Retry-After" in last_resp.headers
    _clear_login_rate_limit()
