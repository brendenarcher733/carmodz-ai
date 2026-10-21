# services/providers/yelp_places_provider.py
# Concrete PlacesProvider adapter for the Yelp Fusion API
# (https://docs.developer.yelp.com/reference/v3_business_search).
#
# This is the one file in the whole feature that knows anything
# Yelp-specific — services/places_provider.py's Protocol boundary and
# models/shop.py's NearbyShop schema are what keep routers/shops.py and the
# frontend completely unaware this is Yelp and not some other vendor.
#
# IMPORTANT — this adapter has not been exercised against a live key: no
# PLACES_API_KEY exists anywhere in this repository (see core/config.py).
# It is inert on every current deploy (services.places_provider.
# get_places_provider() only ever returns this class once PLACES_PROVIDER=yelp
# and a real PLACES_API_KEY are both set) and should be smoke-tested against
# a real key before relying on it in production.

import logging

import httpx

from models.shop import NearbyShop
from services.places_provider import PlacesProviderError

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://api.yelp.com/v3/businesses/search"
_MAX_RADIUS_METERS = 40_000   # Yelp's own documented ceiling (~24.8 miles)
_METERS_PER_MILE = 1609.34
_RESULT_LIMIT = 10
_REQUEST_TIMEOUT_SECONDS = 8


def _meters_to_miles(meters) -> float | None:
    if not isinstance(meters, (int, float)):
        return None
    return round(meters / _METERS_PER_MILE, 1)


def _display_address(location: dict) -> str:
    # Yelp's own pre-formatted multi-line address, joined into one line —
    # defensive against a missing/empty list rather than assuming the shape.
    parts = location.get("display_address") if isinstance(location, dict) else None
    if isinstance(parts, list) and parts:
        return ", ".join(p for p in parts if isinstance(p, str) and p.strip())
    return ""


def _primary_category(categories) -> str:
    if isinstance(categories, list) and categories:
        first = categories[0]
        if isinstance(first, dict) and isinstance(first.get("title"), str):
            return first["title"]
    return "Auto Shop"


def _normalize(business: dict) -> NearbyShop | None:
    """Returns None (dropped, not invented) for anything missing the
    minimum we consider a usable result — a name and an address. Every
    other field is genuinely optional and stays None when Yelp didn't
    supply it; nothing here is ever guessed."""
    name = business.get("name")
    location = business.get("location") or {}
    address = _display_address(location)
    if not isinstance(name, str) or not name.strip() or not address:
        return None

    coords = business.get("coordinates") or {}
    lat = coords.get("latitude") if isinstance(coords, dict) else None
    lng = coords.get("longitude") if isinstance(coords, dict) else None

    return NearbyShop(
        name=name.strip(),
        category=_primary_category(business.get("categories")),
        address=address,
        distance_miles=_meters_to_miles(business.get("distance")),
        phone=(business.get("display_phone") or "").strip() or None,
        rating=business.get("rating") if isinstance(business.get("rating"), (int, float)) else None,
        rating_count=business.get("review_count") if isinstance(business.get("review_count"), int) else None,
        # Deliberately not populated: Yelp's search endpoint doesn't return
        # hours — only its per-business details endpoint does, which would
        # mean one extra API call per result shown. Left as None (honest
        # "not supplied") rather than adding that N+1 cost sight-unseen;
        # worth a follow-up if hours turn out to matter to users.
        hours_today=None,
        latitude=lat if isinstance(lat, (int, float)) else None,
        longitude=lng if isinstance(lng, (int, float)) else None,
    )


class YelpPlacesProvider:
    """Implements services.places_provider.PlacesProvider."""

    def __init__(self, api_key: str):
        self._api_key = api_key

    async def search_nearby(
        self, *, zip_code: str, category_hint: str, radius_miles: int,
    ) -> list[NearbyShop]:
        radius_meters = min(int(radius_miles * _METERS_PER_MILE), _MAX_RADIUS_METERS)
        params = {
            "location": zip_code,
            "term": category_hint,
            "radius": radius_meters,
            "limit": _RESULT_LIMIT,
            "sort_by": "distance",
            "categories": "auto,autorepair,autopartssupplies,autodetailing,bodyshops,tires,carstereoinstallation",
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}

        try:
            async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(_SEARCH_URL, params=params, headers=headers)
        except httpx.HTTPError as e:
            raise PlacesProviderError(f"Yelp request failed: {e}") from e

        if resp.status_code != 200:
            # Never logs the ZIP at anything above debug — the status code
            # and provider name are enough to diagnose a misconfigured key
            # or an outage without putting user location data in logs.
            logger.warning("Yelp search returned status %s", resp.status_code)
            raise PlacesProviderError(f"Yelp search returned status {resp.status_code}")

        try:
            data = resp.json()
        except ValueError as e:
            raise PlacesProviderError(f"Yelp response was not valid JSON: {e}") from e

        businesses = data.get("businesses")
        if not isinstance(businesses, list):
            raise PlacesProviderError("Yelp response had no usable 'businesses' list")

        shops = [s for s in (_normalize(b) for b in businesses if isinstance(b, dict)) if s is not None]
        return shops
