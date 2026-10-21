# services/places_provider.py
# Provider-neutral nearby-shop search. PLACES_PROVIDER/PLACES_API_KEY unset
# (the default on every existing deploy today — see core/config.py's
# places_configured) means get_places_provider() returns None and callers
# show a "location search isn't configured" state. No fake data, no silent
# failure, no live external call ever happens without an explicit key.
#
# Stays I/O-agnostic otherwise — no Redis import here, just the shared
# cache-key naming convention, same pattern services/vehicle_service.py
# uses for its own cache keys. Caching itself (get/set against Redis) lives
# in routers/shops.py, same split as routers/vehicles.py.

import logging
from typing import Literal, Optional, Protocol

from core.config import settings
from models.shop import NearbyShop

logger = logging.getLogger(__name__)


class PlacesProviderError(Exception):
    """Raised by a provider implementation on any failure — network, auth,
    a malformed response, anything. Callers (services/shop_discovery_service.py)
    only ever need to know *that* the call failed, never which vendor's
    SDK/HTTP client raised what, so swapping providers later never touches
    error-handling code outside the one adapter being swapped."""


class PlacesProvider(Protocol):
    async def search_nearby(
        self, *, zip_code: str, category_hint: str, radius_miles: int,
    ) -> list[NearbyShop]:
        """Returns already-normalized NearbyShop objects, newest-distance-first
        where the provider supports ordering. Raises PlacesProviderError on
        failure. An empty list is a legitimate result (no shops found) —
        never substituted with invented data."""
        ...


# ── Category bucket mapping ──────────────────────────────────────────────
# ModRecommendation.category is a mod-content taxonomy (what KIND of part),
# not a shop-search taxonomy (what KIND of business) — this bounds it down
# to a small, fixed set of real-world shop search terms, the same way
# services/vehicle_service.py bounds its own cache key space rather than
# keying on unbounded free text.
CATEGORY_TO_SHOP_BUCKET: dict[str, str] = {
    "performance": "performance shop",
    "handling":    "auto repair",
    "sound":       "car audio",
    "cosmetic":    "auto body shop",
    "reliability": "auto repair",
    "interior":    "auto upholstery",
}
DEFAULT_SHOP_BUCKET = "auto repair"


def shop_bucket_for_category(category: Optional[str]) -> str:
    if category is None:
        return DEFAULT_SHOP_BUCKET
    return CATEGORY_TO_SHOP_BUCKET.get(category, DEFAULT_SHOP_BUCKET)


# ── Cache key naming (routers/shops.py reads/writes these) ──────────────
# "v1" is an explicit version segment — a future change to what this
# returns bumps this, making every old-prefixed key permanently unreachable
# without needing a manual flush. Same convention as vehicle_service.py's
# VEHICLE_CATALOG_CACHE_PREFIX.
PLACES_CACHE_VERSION = "v1"
PLACES_CACHE_PREFIX = f"shops:{PLACES_CACHE_VERSION}"

# 7 days — a shop's existence/address/phone changes far less often than the
# AI-generated or catalog data this app caches elsewhere (vehicle_catalog
# and the recommendation cache both use 24h). IMPORTANT: this number has
# not been checked against any specific provider's terms of service — some
# places APIs restrict how long certain result fields may be cached or
# stored. Confirm against the actual provider's current ToS before this
# runs in production; see the architecture report this module implements.
PLACES_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7


def nearby_shops_cache_key(provider: str, zip_code: str, category: Optional[str]) -> str:
    bucket = shop_bucket_for_category(category)
    return f"{PLACES_CACHE_PREFIX}:{provider}:{zip_code}:{bucket}"


# ── Provider selection ───────────────────────────────────────────────────

def get_places_provider() -> Optional[PlacesProvider]:
    """None means "not configured" — the only state every existing deploy
    is in today, since PLACES_PROVIDER is unset everywhere. Callers must
    treat None as a first-class, expected case, never as an error."""
    if not settings.places_configured:
        return None

    if settings.places_provider == "yelp":
        from services.providers.yelp_places_provider import YelpPlacesProvider
        return YelpPlacesProvider(api_key=settings.places_api_key)

    logger.warning(
        "PLACES_PROVIDER=%r is set but not a recognized provider — treating as unconfigured",
        settings.places_provider,
    )
    return None
