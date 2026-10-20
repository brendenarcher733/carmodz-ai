# routers/vehicles.py
# Read-only vehicle catalog — public (no auth required, same as the anonymous
# plan preview), since this is reference data, not anything user-specific.
#
# Caching: /makes and /makes/{make}/models are cached in Redis — the same
# shared pool every other async Redis use in this app already uses
# (core/redis_pool.py via app.state.redis_pool, see routers/builds.py's
# job-enqueue and core/rate_limit.py's RateLimiter). /lookup is deliberately
# NOT cached: its key space is effectively unbounded (every make/model/year
# combination anyone might query), unlike the small, enumerable set of
# makes and per-make model lists, and it's already a cheap two-query lookup
# with nothing expensive to save.
#
# A cache miss (including a cold cache, a TTL expiry, or Redis being down)
# always falls through to the exact same database-backed service functions
# used before this existed — see _cache_get/_cache_set below. Any Redis
# error is swallowed and logged, never surfaced to the caller: a read must
# keep working from the database no matter what Redis is doing.

import json
import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from core.database import get_db
from models.vehicle import VehicleLookupResponse, VehicleMakeOut, VehicleModelOut, VehicleProductionRangeOut
from services.vehicle_service import (
    VEHICLE_CATALOG_CACHE_TTL_SECONDS,
    check_vehicle,
    list_active_makes,
    list_active_models_for_make,
    makes_cache_key,
    models_cache_key,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])


async def _cache_get(redis, key: str) -> list | None:
    """Best-effort cache read. Returns None on a genuine miss AND on any
    Redis problem (down, timeout, corrupt value) — callers can't tell the
    difference, which is the point: both just mean "go to the database"."""
    try:
        raw = await redis.get(key)
    except Exception:
        logger.warning("Vehicle catalog cache read failed for %s — falling back to the database", key, exc_info=True)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        logger.warning("Vehicle catalog cache had unparseable JSON for %s — ignoring", key)
        return None


async def _cache_set(redis, key: str, value: list) -> None:
    """Best-effort cache write — never allowed to fail the request that
    triggered it."""
    try:
        await redis.set(key, json.dumps(value), ex=VEHICLE_CATALOG_CACHE_TTL_SECONDS)
    except Exception:
        logger.warning("Vehicle catalog cache write failed for %s — continuing without caching this response", key, exc_info=True)


@router.get("/makes", response_model=list[VehicleMakeOut])
async def get_makes(request: Request, db: Session = Depends(get_db)):
    """Every active make in the catalog, alphabetical."""
    redis = request.app.state.redis_pool
    key = makes_cache_key()

    cached = await _cache_get(redis, key)
    if cached is not None:
        return [VehicleMakeOut.model_validate(m) for m in cached]

    makes = [VehicleMakeOut.model_validate(m) for m in list_active_makes(db)]
    await _cache_set(redis, key, [m.model_dump() for m in makes])
    return makes


@router.get("/makes/{make}/models", response_model=list[VehicleModelOut])
async def get_models_for_make(make: str, request: Request, db: Session = Depends(get_db)):
    """Active models for one make, alphabetical. 404 if the make itself
    isn't in the catalog (or has been deactivated) — same "unknown vs
    invalid" distinction the rest of this feature uses, surfaced here as
    the ordinary REST 404 rather than an empty list, since an empty list
    would be ambiguous ("no models for this make" vs "no such make").
    A 404 is never cached — only a successful list is."""
    redis = request.app.state.redis_pool
    key = models_cache_key(make)

    cached = await _cache_get(redis, key)
    if cached is not None:
        return [VehicleModelOut.model_validate(m) for m in cached]

    models = list_active_models_for_make(db, make)  # raises 404 for an unknown make, before any caching happens
    await _cache_set(redis, key, [m.model_dump() for m in models])
    return models


@router.get("/lookup", response_model=VehicleLookupResponse)
def lookup_vehicle(
    make:  str = Query(..., min_length=1, max_length=100),
    model: str = Query(..., min_length=1, max_length=150),
    year:  int = Query(..., ge=1950, le=2100),
    db: Session = Depends(get_db),
):
    """Check one make/model/year combination against the catalog without
    creating a build — the same check build creation and plan preview run
    internally, exposed read-only. Not cached — see module docstring.

    production_ranges is every active range for the matched model (possibly
    more than one, possibly with gaps between them) — never a single
    collapsed start/end, so a caller can't accidentally treat a gap year as
    valid just because it sits between the overall min and max."""
    result = check_vehicle(db, make, model, year)
    ranges_out = [
        VehicleProductionRangeOut(
            generation_label=r.generation_label,
            production_year_start=r.production_year_start,
            production_year_end=r.production_year_end,
        )
        for r in result.ranges
    ]
    return VehicleLookupResponse(
        status=result.status.value,
        make=make,
        model=model,
        year=year,
        production_ranges=ranges_out,
        message=result.message,
    )
