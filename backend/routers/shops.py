# routers/shops.py
# ZIP-based nearby automotive shop search. Public (no auth required), same
# reasoning as routers/plans.py and routers/guides.py: not user-specific,
# and the recommendation it's for might not even be persisted.
#
# A distinct feature from online retailer links (frontend-only,
# frontend/src/lib/retailers.js, used by ShopLinks.jsx) — this is a
# location search against a real backend, those are static URL templates.
# Deliberately not merged with ShopLinks in either direction.
#
# Caching: only "ok" results are cached — a "not_configured"/"error"
# response reflects current app config or a transient failure, not real
# shop data, and caching either would mean a since-configured deploy (or a
# since-recovered provider) keeps serving a stale negative result for up to
# PLACES_CACHE_TTL_SECONDS. Same best-effort get/set split as
# routers/vehicles.py: any Redis problem falls through to a live call,
# never fails the request.

import json
import logging

from fastapi import APIRouter, Depends, Request

from core import analytics
from core.config import settings
from core.rate_limit import RateLimiter
from models.shop import NearbyShopsRequest, NearbyShopsResponse
from services.places_provider import PLACES_CACHE_TTL_SECONDS, nearby_shops_cache_key
from services.shop_discovery_service import find_nearby_shops

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shops", tags=["Nearby Shops"])

# This can trigger a real paid external call once a provider is configured
# — same abuse guard every other anonymous-reachable external-cost endpoint
# in this app has (routers/plans.py, routers/guides.py). Tighter than
# guides' 20/600s since a configured places provider is metered per call
# with no local-fallback floor the way guides has a deterministic template.
nearby_shops_rate_limit = RateLimiter(times=10, seconds=600, scope="nearby_shops")


async def _cache_get(redis, key: str) -> dict | None:
    try:
        raw = await redis.get(key)
    except Exception:
        logger.warning("Nearby-shops cache read failed for %s — falling back to a live search", key, exc_info=True)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        logger.warning("Nearby-shops cache had unparseable JSON for %s — ignoring", key)
        return None


async def _cache_set(redis, key: str, value: dict) -> None:
    try:
        await redis.set(key, json.dumps(value), ex=PLACES_CACHE_TTL_SECONDS)
    except Exception:
        logger.warning("Nearby-shops cache write failed for %s — continuing without caching this response", key, exc_info=True)


@router.post("/nearby", response_model=NearbyShopsResponse, dependencies=[Depends(nearby_shops_rate_limit)])
async def search_nearby_shops(data: NearbyShopsRequest, request: Request):
    """Always 200 — "not configured," "no results," and "provider error"
    are all legitimate NearbyShopsResponse states, not HTTP failures. A
    genuine HTTP-level failure (network, rate limit, an unexpected bug) is
    what the frontend's own error handling is for."""
    redis = request.app.state.redis_pool
    # The configured provider name, not a hardcoded one — so a future
    # switch to a different PLACES_PROVIDER never serves stale results
    # cached under the previous vendor's key space.
    key = nearby_shops_cache_key(settings.places_provider or "none", data.zip_code, data.category)

    cached = await _cache_get(redis, key)
    if cached is not None:
        return NearbyShopsResponse.model_validate(cached)

    result = await find_nearby_shops(data)

    if result.status == "ok":
        await _cache_set(redis, key, result.model_dump())

    # category only — the ZIP itself is exactly the "precise user location"
    # this feature's privacy rules say not to log unnecessarily.
    analytics.capture("nearby_shops_searched", {"category": data.category, "status": result.status})
    return result
