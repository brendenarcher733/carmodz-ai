# services/shop_discovery_service.py
# Orchestrates one nearby-shop search: picks the configured provider (if
# any), calls it, and turns the outcome into one of the four honest
# NearbyShopsResponse states. Stays I/O-agnostic otherwise — no Redis
# import here, same split as services/vehicle_service.py; caching lives in
# routers/shops.py.

import logging

from models.shop import NearbyShopsRequest, NearbyShopsResponse
from services.places_provider import (
    PlacesProviderError,
    get_places_provider,
    shop_bucket_for_category,
)

logger = logging.getLogger(__name__)

NOT_CONFIGURED_MESSAGE = "Location search isn't set up yet for this deployment."
ERROR_MESSAGE = "Couldn't reach shop search right now — try again in a moment."

DEFAULT_RADIUS_MILES = 15


async def find_nearby_shops(
    request: NearbyShopsRequest, *, radius_miles: int = DEFAULT_RADIUS_MILES,
) -> NearbyShopsResponse:
    provider = get_places_provider()
    if provider is None:
        # The only state every existing deploy is in today (no
        # PLACES_PROVIDER configured) — explicit and concise, never a fake
        # or empty-looking result that could be mistaken for "no shops
        # nearby." See core/config.py's places_configured.
        return NearbyShopsResponse(status="not_configured", shops=[], message=NOT_CONFIGURED_MESSAGE)

    category_hint = shop_bucket_for_category(request.category)

    try:
        shops = await provider.search_nearby(
            zip_code=request.zip_code, category_hint=category_hint, radius_miles=radius_miles,
        )
    except PlacesProviderError:
        # Never logs the ZIP — see YelpPlacesProvider's own logging for why.
        logger.exception("Nearby-shop search failed")
        return NearbyShopsResponse(status="error", shops=[], message=ERROR_MESSAGE)

    if not shops:
        return NearbyShopsResponse(status="no_results", shops=[])

    return NearbyShopsResponse(status="ok", shops=shops)
