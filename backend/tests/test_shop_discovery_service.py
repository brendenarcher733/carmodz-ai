# tests/test_shop_discovery_service.py
#
# Covers find_nearby_shops()'s four-state contract using a fake provider —
# no real Yelp key or network call involved. See test_places_provider.py
# for the provider-selection logic itself, and test_shops_router.py for the
# HTTP-level "not configured" behavior on every current deploy.
#
# Plain sync test functions driving the async service via asyncio.run() —
# pytest-asyncio isn't a dependency of this project (confirmed: nothing
# else in this suite uses @pytest.mark.asyncio either), so this matches the
# existing convention rather than adding one.

import asyncio

from models.shop import NearbyShop, NearbyShopsRequest
from services.places_provider import PlacesProviderError
from services import shop_discovery_service


class _FakeProvider:
    def __init__(self, shops=None, error=None):
        self._shops = shops if shops is not None else []
        self._error = error

    async def search_nearby(self, *, zip_code, category_hint, radius_miles):
        if self._error is not None:
            raise self._error
        return self._shops


SOME_SHOP = NearbyShop(name="Joe's Auto Repair", category="Auto Repair", address="123 Main St, Springfield, IL 62701")


def test_not_configured_when_no_provider_is_available(monkeypatch):
    monkeypatch.setattr(shop_discovery_service, "get_places_provider", lambda: None)
    result = asyncio.run(shop_discovery_service.find_nearby_shops(NearbyShopsRequest(zip_code="62701")))
    assert result.status == "not_configured"
    assert result.shops == []
    assert result.message


def test_ok_with_shops_when_provider_finds_results(monkeypatch):
    monkeypatch.setattr(shop_discovery_service, "get_places_provider", lambda: _FakeProvider(shops=[SOME_SHOP]))
    result = asyncio.run(shop_discovery_service.find_nearby_shops(NearbyShopsRequest(zip_code="62701")))
    assert result.status == "ok"
    assert result.shops == [SOME_SHOP]


def test_no_results_status_for_a_genuinely_empty_search(monkeypatch):
    monkeypatch.setattr(shop_discovery_service, "get_places_provider", lambda: _FakeProvider(shops=[]))
    result = asyncio.run(shop_discovery_service.find_nearby_shops(NearbyShopsRequest(zip_code="62701")))
    assert result.status == "no_results"
    assert result.shops == []


def test_error_status_when_the_provider_raises(monkeypatch):
    monkeypatch.setattr(
        shop_discovery_service, "get_places_provider",
        lambda: _FakeProvider(error=PlacesProviderError("boom")),
    )
    result = asyncio.run(shop_discovery_service.find_nearby_shops(NearbyShopsRequest(zip_code="62701")))
    assert result.status == "error"
    assert result.shops == []
    assert result.message


def test_never_invents_fields_the_provider_did_not_supply(monkeypatch):
    """A shop with every optional field omitted must stay omitted all the
    way through — nothing in this service layer fills in a guess."""
    bare_shop = NearbyShop(name="Minimal Shop", category="Auto Repair", address="1 Elm St")
    monkeypatch.setattr(shop_discovery_service, "get_places_provider", lambda: _FakeProvider(shops=[bare_shop]))
    result = asyncio.run(shop_discovery_service.find_nearby_shops(NearbyShopsRequest(zip_code="62701")))
    shop = result.shops[0]
    assert shop.distance_miles is None
    assert shop.phone is None
    assert shop.rating is None
    assert shop.rating_count is None
    assert shop.hours_today is None
