# services/vehicle_service.py
# Read-only catalog lookups + the one business rule this phase adds: deciding
# whether a given (make, model, year) is VERIFIED, UNVERIFIED (not in the
# catalog), or INVALID_YEAR (the make/model is known, but this year doesn't
# fall inside any of its verified production ranges). See models/vehicle.py
# for why those are three distinct outcomes rather than a plain yes/no, and
# why a model's valid years are a set of discrete ranges, not one min/max span.

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.vehicle import VehicleMake, VehicleModel, VehicleModelOut, VehicleProductionRange, VehicleProductionRangeOut


def normalize_name(name: str) -> str:
    """Lowercase + collapse whitespace — the lookup key for both makes and
    models. Deliberately simple: this only needs to make "Mercedes-Benz" /
    "mercedes-benz" / "  Mercedes-Benz  " collide, not handle every possible
    spelling variant (e.g. abbreviations) — that's future scope, not this
    phase's."""
    return re.sub(r"\s+", " ", name.strip().lower())


class VehicleCheckStatus(str, Enum):
    VERIFIED     = "verified"
    UNVERIFIED   = "unverified"
    INVALID_YEAR = "invalid_year"


def _format_range(r: VehicleProductionRange) -> str:
    return f"{r.production_year_start}–{r.production_year_end if r.production_year_end is not None else 'present'}"


@dataclass
class VehicleCheckResult:
    status: VehicleCheckStatus
    make:   Optional[VehicleMake]  = None
    model:  Optional[VehicleModel] = None
    # Every ACTIVE VehicleProductionRange for `model`, populated whenever a
    # model was found (whether the year matched one of them or not) — never
    # a single collapsed start/end. Empty if model is None, or if the model
    # exists but has no active ranges at all (treated as UNVERIFIED, see
    # check_vehicle — there's nothing to validate against yet).
    ranges: list = field(default_factory=list)

    @property
    def message(self) -> str:
        if self.status is VehicleCheckStatus.VERIFIED:
            return "Verified against the vehicle catalog."
        if self.status is VehicleCheckStatus.INVALID_YEAR:
            spans = ", ".join(_format_range(r) for r in self.ranges)
            return f"Verified production years for this model are: {spans}."
        return "Not in the verified vehicle catalog yet — treated as unverified, not rejected."


def _find_active_make(db: Session, make: str) -> Optional[VehicleMake]:
    return (
        db.query(VehicleMake)
        .filter(VehicleMake.normalized_name == normalize_name(make), VehicleMake.is_active.is_(True))
        .first()
    )


def _find_active_model(db: Session, make_row: VehicleMake, model: str) -> Optional[VehicleModel]:
    return (
        db.query(VehicleModel)
        .filter(
            VehicleModel.make_id == make_row.id,
            VehicleModel.normalized_name == normalize_name(model),
            VehicleModel.is_active.is_(True),
        )
        .first()
    )


def _active_ranges_for(model: VehicleModel) -> list[VehicleProductionRange]:
    """Sorted oldest-first — the order every range-spans message/UI list
    should read in. Filters out deactivated ranges (bad data for that one
    span) without needing a second DB round trip, since `model` was just
    loaded in this same request/session."""
    return sorted((r for r in model.production_ranges if r.is_active), key=lambda r: r.production_year_start)


def check_vehicle(db: Session, make: str, model: str, year: int) -> VehicleCheckResult:
    """The one function every call site (build creation, preview, the
    /lookup endpoint) shares — so "what counts as verified" can never drift
    between them.

    An inactive make/model/range is treated exactly like a missing one
    (UNVERIFIED), not like a hard mismatch — deactivating a catalog entry
    means "stop vouching for this," not "actively reject anyone who has one."

    A year counts as verified only if it falls inside at least one active
    VehicleProductionRange — NOT by comparing against a model-level min/max,
    which would incorrectly validate years inside a real production gap
    (Dodge Viper, Acura/Honda NSX, ...).
    """
    make_row = _find_active_make(db, make)
    if make_row is None:
        return VehicleCheckResult(status=VehicleCheckStatus.UNVERIFIED)

    model_row = _find_active_model(db, make_row, model)
    if model_row is None:
        return VehicleCheckResult(status=VehicleCheckStatus.UNVERIFIED, make=make_row)

    ranges = _active_ranges_for(model_row)
    if not ranges:
        # Model exists but has no verified production data at all yet —
        # nothing to check the year against, so this is "not verified," not
        # "known invalid."
        return VehicleCheckResult(status=VehicleCheckStatus.UNVERIFIED, make=make_row, model=model_row)

    for r in ranges:
        if year >= r.production_year_start and (r.production_year_end is None or year <= r.production_year_end):
            return VehicleCheckResult(status=VehicleCheckStatus.VERIFIED, make=make_row, model=model_row, ranges=ranges)

    return VehicleCheckResult(status=VehicleCheckStatus.INVALID_YEAR, make=make_row, model=model_row, ranges=ranges)


# ── Catalog listing (backs routers/vehicles.py) ────────────────────────────────

def list_active_makes(db: Session) -> list[VehicleMake]:
    return db.query(VehicleMake).filter(VehicleMake.is_active.is_(True)).order_by(VehicleMake.name).all()


def _model_out(model: VehicleModel) -> VehicleModelOut:
    ranges = [
        VehicleProductionRangeOut(
            generation_label=r.generation_label,
            production_year_start=r.production_year_start,
            production_year_end=r.production_year_end,
        )
        for r in _active_ranges_for(model)
    ]
    return VehicleModelOut(id=model.id, name=model.name, production_ranges=ranges)


def list_active_models_for_make(db: Session, make: str) -> list[VehicleModelOut]:
    """Returns already-built VehicleModelOut objects (active ranges only,
    pre-filtered here) rather than raw ORM rows — letting FastAPI's
    from_attributes walk model.production_ranges directly would include
    deactivated ranges, which is exactly the leak this function exists to
    prevent."""
    make_row = _find_active_make(db, make)
    if make_row is None:
        raise HTTPException(status_code=404, detail=f"Unknown or inactive make: {make!r}")
    models = (
        db.query(VehicleModel)
        .filter(VehicleModel.make_id == make_row.id, VehicleModel.is_active.is_(True))
        .order_by(VehicleModel.name)
        .all()
    )
    return [_model_out(m) for m in models]


# ── Cache key naming (routers/vehicles.py reads/writes these; scripts/
# seed_vehicle_catalog.py invalidates them after a seed run) ────────────────
#
# This module stays I/O-agnostic otherwise — no Redis import here, just the
# shared naming convention, same way workers/recommendation_worker.py keeps
# its own `_recommendation_cache_key` next to the logic that uses it rather
# than introducing a separate caching abstraction. `v1` is the explicit
# version segment: a future change to what these endpoints return (schema
# or semantics) bumps this, which makes every old-prefixed key permanently
# unreachable (and naturally expire later) without needing a manual flush.
VEHICLE_CATALOG_CACHE_VERSION = "v1"
VEHICLE_CATALOG_CACHE_PREFIX = f"vehicle_catalog:{VEHICLE_CATALOG_CACHE_VERSION}"
# 24h, same horizon as workers/recommendation_worker.py's recommendation
# cache — this data only ever changes via a deliberate seed run, which also
# actively invalidates (see scripts/seed_vehicle_catalog.py), so the TTL is
# a safety net bounding worst-case staleness, not the primary mechanism.
VEHICLE_CATALOG_CACHE_TTL_SECONDS = 60 * 60 * 24


def makes_cache_key() -> str:
    return f"{VEHICLE_CATALOG_CACHE_PREFIX}:makes"


def models_cache_key(make: str) -> str:
    return f"{VEHICLE_CATALOG_CACHE_PREFIX}:models:{normalize_name(make)}"
