# tests/test_vehicle_catalog_cache.py
#
# Covers Redis caching of the read-only vehicle catalog endpoints
# (routers/vehicles.py's /makes and /makes/{make}/models). Runs against the
# same real Redis instance the rest of the suite uses (REDIS_URL in
# tests/conftest.py) — not a fake — so these are genuine integration tests
# of the cache-hit/miss/failure paths, not mocks of them.
#
# Direct Redis assertions here use the plain *synchronous* redis-py client
# (same approach as scripts/seed_vehicle_catalog.py's own invalidation),
# not app.state.redis_pool directly — that pool's async connection is bound
# to the event loop TestClient creates during the `client` fixture's own
# lifespan, and reusing it from a freshly-made loop (e.g. via asyncio.run in
# a plain test function) raises "attached to a different loop". A separate
# sync connection to the same Redis instance sees identical data with none
# of that complexity.
#
# Redis state isn't reset between tests (unlike the SQL DB, which
# tests/conftest.py's autouse _fresh_tables fixture recreates every test),
# so every test here either uses a make name unique to it, or explicitly
# deletes its own key(s) before asserting — never relies on starting from
# an empty cache.

import redis as redis_sync

import main
from core.config import settings
from models.vehicle import VehicleMake
from services.vehicle_service import (
    VEHICLE_CATALOG_CACHE_PREFIX,
    VEHICLE_CATALOG_CACHE_TTL_SECONDS,
    makes_cache_key,
    models_cache_key,
    normalize_name,
)


def _seed_make(db, name):
    m = VehicleMake(name=name, normalized_name=normalize_name(name), is_active=True)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def _sync_redis():
    return redis_sync.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)


def _redis_get(key):
    r = _sync_redis()
    try:
        return r.get(key)
    finally:
        r.close()


def _redis_ttl(key):
    r = _sync_redis()
    try:
        return r.ttl(key)
    finally:
        r.close()


def _redis_delete(*keys):
    r = _sync_redis()
    try:
        return r.delete(*keys)
    finally:
        r.close()


def _count_vehicle_cache_keys() -> int:
    r = _sync_redis()
    try:
        return len(list(r.scan_iter(match=f"{VEHICLE_CATALOG_CACHE_PREFIX}:*")))
    finally:
        r.close()


# ── cache key naming ─────────────────────────────────────────────────────────

def test_cache_keys_use_a_distinct_versioned_namespace():
    assert VEHICLE_CATALOG_CACHE_PREFIX == "vehicle_catalog:v1"
    assert makes_cache_key() == "vehicle_catalog:v1:makes"
    assert models_cache_key("Honda").startswith("vehicle_catalog:v1:models:")
    # Never collides with the unrelated recommendation cache.
    assert not makes_cache_key().startswith("recgen:cache:")
    assert not models_cache_key("Honda").startswith("recgen:cache:")


def test_models_cache_key_is_normalized():
    assert models_cache_key("Mercedes-Benz") == models_cache_key("  mercedes-benz  ")


# ── /makes — cache miss, then hit ───────────────────────────────────────────

def test_makes_endpoint_cache_miss_populates_then_serves_from_cache(client, db, monkeypatch):
    key = makes_cache_key()
    _redis_delete(key)  # guarantee a clean slate regardless of prior test runs
    _seed_make(db, "Acura")

    resp1 = client.get("/api/vehicles/makes")
    assert resp1.status_code == 200
    first_body = resp1.json()
    assert any(m["name"] == "Acura" for m in first_body)

    # Cache must actually be populated now, as real JSON.
    assert _redis_get(key) is not None

    # Second call must not hit the database at all — proven by making the
    # DB-backed function explode if it's called again.
    def _must_not_be_called(*a, **kw):
        raise AssertionError("list_active_makes was called on what should have been a cache hit")

    monkeypatch.setattr("routers.vehicles.list_active_makes", _must_not_be_called)

    resp2 = client.get("/api/vehicles/makes")
    assert resp2.status_code == 200
    assert resp2.json() == first_body


def test_models_endpoint_cache_miss_populates_then_serves_from_cache(client, db, monkeypatch):
    make_name = "Lexus"
    key = models_cache_key(make_name)
    _redis_delete(key)
    make = _seed_make(db, make_name)

    from models.vehicle import VehicleModel, VehicleProductionRange
    model = VehicleModel(
        make_id=make.id, name="LC 500", normalized_name=normalize_name("LC 500"),
        production_year_start=2017, production_year_end=None, is_active=True,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    db.add(VehicleProductionRange(vehicle_model_id=model.id, production_year_start=2017, production_year_end=None, is_active=True))
    db.commit()

    resp1 = client.get(f"/api/vehicles/makes/{make_name}/models")
    assert resp1.status_code == 200
    first_body = resp1.json()
    assert first_body[0]["name"] == "LC 500"

    assert _redis_get(key) is not None

    def _must_not_be_called(*a, **kw):
        raise AssertionError("list_active_models_for_make was called on what should have been a cache hit")

    monkeypatch.setattr("routers.vehicles.list_active_models_for_make", _must_not_be_called)

    resp2 = client.get(f"/api/vehicles/makes/{make_name}/models")
    assert resp2.status_code == 200
    assert resp2.json() == first_body


def test_unknown_make_404_is_never_cached(client, db):
    key = models_cache_key("Definitely Not A Real Make")
    _redis_delete(key)

    resp = client.get("/api/vehicles/makes/Definitely Not A Real Make/models")
    assert resp.status_code == 404
    assert _redis_get(key) is None


# ── TTL (stale/expired behavior, checked without a slow sleep-based test) ───

def test_cached_entry_has_a_bounded_explicit_ttl(client, db):
    key = makes_cache_key()
    _redis_delete(key)
    _seed_make(db, "Infiniti")

    resp = client.get("/api/vehicles/makes")
    assert resp.status_code == 200

    ttl = _redis_ttl(key)
    assert 0 < ttl <= VEHICLE_CATALOG_CACHE_TTL_SECONDS


def test_expired_entry_is_treated_as_a_miss_and_repopulated(client, db):
    """Simulates expiry directly (deleting the key has the same observable
    effect from the endpoint's perspective as its TTL having elapsed)
    rather than sleeping for real in the test suite."""
    key = makes_cache_key()
    _seed_make(db, "Genesis")
    client.get("/api/vehicles/makes")  # populate
    assert _redis_get(key) is not None

    _redis_delete(key)  # stand-in for TTL expiry
    assert _redis_get(key) is None

    resp = client.get("/api/vehicles/makes")
    assert resp.status_code == 200
    assert any(m["name"] == "Genesis" for m in resp.json())
    assert _redis_get(key) is not None  # repopulated


# ── Redis failure must never fail the endpoint ──────────────────────────────

def test_redis_failure_on_read_falls_back_to_the_database(client, db, monkeypatch):
    _seed_make(db, "Volvo")

    class _BrokenRedis:
        async def get(self, *a, **kw):
            raise ConnectionError("simulated Redis outage")

        async def set(self, *a, **kw):
            raise ConnectionError("simulated Redis outage")

    monkeypatch.setattr(main.app.state, "redis_pool", _BrokenRedis())

    resp = client.get("/api/vehicles/makes")
    assert resp.status_code == 200
    assert any(m["name"] == "Volvo" for m in resp.json())


def test_redis_failure_on_models_endpoint_falls_back_to_the_database(client, db, monkeypatch):
    make_name = "Kia"
    make = _seed_make(db, make_name)
    from models.vehicle import VehicleModel, VehicleProductionRange
    model = VehicleModel(
        make_id=make.id, name="EV6 GT", normalized_name=normalize_name("EV6 GT"),
        production_year_start=2022, production_year_end=None, is_active=True,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    db.add(VehicleProductionRange(vehicle_model_id=model.id, production_year_start=2022, production_year_end=None, is_active=True))
    db.commit()

    class _BrokenRedis:
        async def get(self, *a, **kw):
            raise TimeoutError("simulated Redis timeout")

        async def set(self, *a, **kw):
            raise TimeoutError("simulated Redis timeout")

    monkeypatch.setattr(main.app.state, "redis_pool", _BrokenRedis())

    resp = client.get(f"/api/vehicles/makes/{make_name}/models")
    assert resp.status_code == 200
    assert resp.json()[0]["name"] == "EV6 GT"


# ── /lookup is deliberately not cached ───────────────────────────────────────

def test_lookup_endpoint_does_not_write_any_cache_key(client, db):
    before = _count_vehicle_cache_keys()
    client.get("/api/vehicles/lookup", params={"make": "Honda", "model": "Civic", "year": 2020})
    after = _count_vehicle_cache_keys()
    assert after == before


# ── Seed-time invalidation ───────────────────────────────────────────────────

def test_seed_deletes_stale_cached_entries(db):
    from scripts.seed_vehicle_catalog import seed

    key = makes_cache_key()
    r = _sync_redis()
    r.set(key, '["stale cached data"]')
    assert r.get(key) is not None

    seed(db)

    assert r.get(key) is None
    r.close()


def test_invalidate_cache_does_not_raise_when_redis_is_unreachable(monkeypatch):
    from scripts.seed_vehicle_catalog import _invalidate_cache

    monkeypatch.setattr(settings, "redis_url", "redis://localhost:1")  # nothing listens here
    _invalidate_cache()  # must not raise
