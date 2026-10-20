# models/vehicle.py
# Vehicle catalog — SQLAlchemy ORM + Pydantic schemas.
#
# This is deliberately the smallest schema that lets the app distinguish
# "verified" (make/model/year all match a catalog entry, and the year falls
# inside at least one of that model's verified production ranges) from
# "unverified" (make/model/year that simply isn't in the catalog yet) from
# "known-invalid" (make/model IS in the catalog, but the given year falls
# outside every one of its verified production ranges).
#
# Phase 1.1: a VehicleModel's production span is NOT a single contiguous
# [start, end] — real nameplates have gaps and multiple generations (Dodge
# Viper, Acura/Honda NSX, Toyota Supra vs. GR Supra, etc.), and treating the
# overall min/max as continuous would silently validate years inside a real
# production gap. VehicleProductionRange is the actual source of truth for
# "was this specific year produced"; VehicleModel.production_year_start/end
# are kept only as a denormalized display summary (see that model's
# docstring) and are NEVER consulted by validation — see
# services/vehicle_service.py::check_vehicle.
#
# No trims/engines/drivetrains/fitment rules yet.

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from pydantic import BaseModel, ConfigDict, Field

from core.database import Base


# ── ORM Models ────────────────────────────────────────────────────────────────

class VehicleMake(Base):
    __tablename__ = "vehicle_makes"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    # Lowercased, whitespace-collapsed form of `name` — the actual lookup key,
    # so "Mercedes-Benz" / "mercedes-benz" / "  Mercedes-Benz " all resolve to
    # the same row. See services/vehicle_service.py::normalize_name.
    normalized_name = Column(String(100), nullable=False, unique=True, index=True)
    # Only active makes are returned by the catalog API or used for build
    # validation — deactivating a make (bad data, renamed, etc.) without
    # deleting it keeps historical builds/recommendations referencing it
    # intact, it just stops being treated as "known" going forward.
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    models = relationship("VehicleModel", back_populates="make", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<VehicleMake id={self.id} {self.name}>"


class VehicleModel(Base):
    __tablename__ = "vehicle_models"
    __table_args__ = (
        # Scoped to one make, not globally unique — "Charger" under Dodge and
        # a hypothetical "Charger" under another make are different vehicles.
        UniqueConstraint("make_id", "normalized_name", name="uq_vehicle_model_make_normalized_name"),
    )

    id                      = Column(Integer, primary_key=True, index=True)
    make_id                 = Column(Integer, ForeignKey("vehicle_makes.id", ondelete="CASCADE"), nullable=False, index=True)
    name                    = Column(String(150), nullable=False)
    normalized_name         = Column(String(150), nullable=False, index=True)
    # DENORMALIZED SUMMARY ONLY — min(start) / max(end) across this model's
    # active VehicleProductionRange rows (None if any range is open-ended).
    # Kept for backwards compatibility and quick display (e.g. an admin list
    # view), but NEVER used for validation: a year between these two numbers
    # is not necessarily a year this model was actually produced (see the
    # Viper/NSX/Supra gap cases). services/vehicle_service.check_vehicle
    # reads production_ranges below, never these two columns. Kept in sync
    # by scripts/seed_vehicle_catalog.py each time it runs.
    production_year_start  = Column(Integer, nullable=False)
    production_year_end    = Column(Integer, nullable=True)
    is_active               = Column(Boolean, nullable=False, default=True)
    # Where production_year_start/end were last derived from — informational
    # only now that per-range source metadata exists on VehicleProductionRange.
    source_url              = Column(String(500), nullable=True)
    source_last_verified_at = Column(DateTime, nullable=True)
    created_at               = Column(DateTime, default=datetime.utcnow)

    make              = relationship("VehicleMake", back_populates="models")
    production_ranges = relationship(
        "VehicleProductionRange", back_populates="model", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<VehicleModel id={self.id} {self.name} ({self.production_year_start}-{self.production_year_end or 'present'})>"


class VehicleProductionRange(Base):
    """One contiguous, independently-verified production span for a
    VehicleModel. A model with a production gap or multiple generations
    (Viper, NSX, ...) has more than one row here — see
    services/vehicle_service.check_vehicle, which treats a year as valid
    only if it falls inside at least one active range, never by taking the
    min/max across them."""

    __tablename__ = "vehicle_production_ranges"
    __table_args__ = (
        # Prevents the seed script from ever creating two identical range
        # rows for the same model on a re-run (see _upsert_range there) —
        # not a claim that two *different* generations can't share a model,
        # just that the exact same span can't be recorded twice.
        UniqueConstraint(
            "vehicle_model_id", "production_year_start", "production_year_end",
            name="uq_vehicle_production_range_model_span",
        ),
    )

    id                      = Column(Integer, primary_key=True, index=True)
    vehicle_model_id        = Column(Integer, ForeignKey("vehicle_models.id", ondelete="CASCADE"), nullable=False, index=True)
    # Human-readable, optional — e.g. "5th gen (VX)" for a Viper range.
    # Never used for matching/validation, display only.
    generation_label        = Column(String(100), nullable=True)
    production_year_start   = Column(Integer, nullable=False)
    # NULL = still in production as of source_last_verified_at — not "unknown".
    production_year_end     = Column(Integer, nullable=True)
    source_url               = Column(String(500), nullable=True)
    source_last_verified_at = Column(DateTime, nullable=True)
    # Deactivating one range (bad data for that specific span) doesn't force
    # deactivating the whole model and its other, still-good ranges.
    is_active                = Column(Boolean, nullable=False, default=True)
    created_at                = Column(DateTime, default=datetime.utcnow)

    model = relationship("VehicleModel", back_populates="production_ranges")

    def __repr__(self):
        return f"<VehicleProductionRange model_id={self.vehicle_model_id} {self.production_year_start}-{self.production_year_end or 'present'}>"


# ── API schemas (read-only catalog endpoints) ──────────────────────────────────
# Deliberately thin projections. Internal bookkeeping (normalized_name,
# is_active, created_at) never crosses the API boundary.

class VehicleMakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:   int
    name: str


class VehicleProductionRangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    generation_label:      Optional[str] = None
    production_year_start: int
    production_year_end:   Optional[int] = None


class VehicleModelOut(BaseModel):
    """Deliberately has NO flat production_year_start/end — exposing those
    here would let a frontend (or any other caller) reconstruct exactly the
    "min/max as a continuous span" bug this schema exists to prevent. Only
    the explicit, possibly-discontiguous list of active ranges is exposed."""
    model_config = ConfigDict(from_attributes=True)

    id:                int
    name:              str
    production_ranges: list[VehicleProductionRangeOut]


class VehicleLookupResponse(BaseModel):
    """Result of checking one make/model/year combination against the
    catalog — the same three-way distinction services/vehicle_service.py's
    VehicleCheckStatus makes, exposed read-only so the frontend (or a test)
    can ask "would this be accepted?" without creating a build.

    production_ranges is every active range for the matched model (empty if
    the model itself is unverified) — same reasoning as VehicleModelOut:
    no flat start/end that could imply a continuous span."""

    status: str = Field(..., description='One of "verified", "unverified", "invalid_year"')
    make:   str
    model:  str
    year:   int
    production_ranges: list[VehicleProductionRangeOut] = Field(default_factory=list)
    message: str
