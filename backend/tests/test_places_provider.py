# tests/test_places_provider.py
#
# Covers the provider-neutral interface itself: category->shop-bucket
# mapping, cache key naming, and get_places_provider()'s safe-default
# behavior — the "no live call without explicit configuration" guarantee
# lives here.

from core.config import settings
from services.places_provider import (
    CATEGORY_TO_SHOP_BUCKET,
    DEFAULT_SHOP_BUCKET,
    get_places_provider,
    nearby_shops_cache_key,
    shop_bucket_for_category,
)


# ── get_places_provider() — the safe-default guarantee ──────────────────

def test_returns_none_when_provider_unset(monkeypatch):
    monkeypatch.setattr(settings, "places_provider", "")
    monkeypatch.setattr(settings, "places_api_key", "")
    assert get_places_provider() is None


def test_returns_none_when_provider_set_but_key_missing(monkeypatch):
    """A provider name alone must never be enough to make a live call —
    the key is the actual gate."""
    monkeypatch.setattr(settings, "places_provider", "yelp")
    monkeypatch.setattr(settings, "places_api_key", "")
    assert get_places_provider() is None


def test_returns_none_for_an_unrecognized_provider_name(monkeypatch):
    monkeypatch.setattr(settings, "places_provider", "some-vendor-nobody-wired-up")
    monkeypatch.setattr(settings, "places_api_key", "fake-key")
    assert get_places_provider() is None


def test_returns_yelp_provider_when_fully_configured(monkeypatch):
    monkeypatch.setattr(settings, "places_provider", "yelp")
    monkeypatch.setattr(settings, "places_api_key", "fake-key-for-test")
    provider = get_places_provider()
    assert provider is not None
    assert type(provider).__name__ == "YelpPlacesProvider"


# ── Category bucket mapping ───────────────────────────────────────────────

def test_every_recommendation_category_has_a_bucket():
    for category in ["performance", "handling", "sound", "cosmetic", "reliability", "interior"]:
        assert category in CATEGORY_TO_SHOP_BUCKET
        assert shop_bucket_for_category(category) == CATEGORY_TO_SHOP_BUCKET[category]


def test_missing_category_falls_back_to_default_bucket():
    assert shop_bucket_for_category(None) == DEFAULT_SHOP_BUCKET


def test_unknown_category_falls_back_to_default_bucket_instead_of_crashing():
    assert shop_bucket_for_category("not-a-real-category") == DEFAULT_SHOP_BUCKET


# ── Cache key naming ───────────────────────────────────────────────────────

def test_cache_key_is_versioned_and_includes_provider_zip_and_bucket():
    key = nearby_shops_cache_key("yelp", "94103", "performance")
    assert key == "shops:v1:yelp:94103:performance shop"


def test_cache_key_differs_by_provider_so_switching_vendors_cant_serve_stale_cross_vendor_data():
    yelp_key = nearby_shops_cache_key("yelp", "94103", "performance")
    other_key = nearby_shops_cache_key("some-other-vendor", "94103", "performance")
    assert yelp_key != other_key
