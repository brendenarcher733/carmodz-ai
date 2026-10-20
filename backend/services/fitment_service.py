# services/fitment_service.py
#
# Deterministic, local fitment evaluation for a recommendation candidate —
# produces the fitment_status/reason/source contract carried by
# models.recommendation.EvaluatedModRecommendation.
#
# Deliberately narrow. The vehicle catalog (models/vehicle.py) tracks
# make/model/production-year ranges only — no engine, drivetrain, or trim
# data — so there is exactly one thing this module can check with real
# confidence: a recommendation that only makes sense on a vehicle with an
# internal-combustion engine's intake/exhaust system (a turbo, an
# intercooler, a cat-back exhaust, ...) cannot fit a vehicle we are
# CERTAIN is fully electric. That certainty only exists for the small,
# explicit set of catalog models below — everything else, including every
# other kind of mismatch nobody has given us data to check, stays
# "unknown". This module never upgrades anything to "verified" on its own;
# "verified" only ever comes from curated data (services/mock_ai.MOD_LIBRARY).
#
# No network calls, no per-recommendation lookups, no external data — pure
# string matching against two small constants, same cost as any other
# in-process function call.

from dataclasses import dataclass
from typing import Literal, Optional

from services.vehicle_service import normalize_name

FitmentStatus = Literal["verified", "unknown", "incompatible"]


@dataclass(frozen=True)
class FitmentResult:
    status: FitmentStatus
    reason: Optional[str] = None
    source: Optional[str] = None


_UNKNOWN = FitmentResult(status="unknown")

# A recommendation naming or categorized around any of these requires an
# internal-combustion engine's intake or exhaust system to mean anything at
# all — confirmed by what the part physically is, not inferred or guessed.
_ICE_INTAKE_EXHAUST_KEYWORDS = (
    "turbo", "intercooler", "downpipe", "wastegate", "blow-off", "blow off", "bov", "boost",
    "intake", "exhaust", "muffler", "catalytic converter", "cat-back", "cat back",
    "axle-back", "axle back", "tailpipe",
)

# Vehicles in our own seeded catalog (scripts/seed_vehicle_catalog.py) that
# are confidently, unambiguously fully electric. This is NOT a general EV
# detector — it's the specific models we've already verified. A new EV
# model added to the catalog without being added here just means this rule
# doesn't fire for it yet (falls back to "unknown"), never the reverse.
_KNOWN_ELECTRIC_MODELS: set[tuple[str, str]] = {
    (normalize_name("Tesla"), normalize_name("Model S")),
    (normalize_name("Tesla"), normalize_name("Model 3")),
    (normalize_name("Tesla"), normalize_name("Model X")),
    (normalize_name("Tesla"), normalize_name("Model Y")),
    (normalize_name("Hyundai"), normalize_name("Ioniq 5 N")),
    (normalize_name("Kia"), normalize_name("EV6 GT")),
}


def _requires_ice_intake_or_exhaust(name: str, category: str) -> bool:
    text = f"{name} {category}".lower()
    return any(kw in text for kw in _ICE_INTAKE_EXHAUST_KEYWORDS)


def evaluate_fitment(
    *, name: str, category: str, make: str, model: str, vehicle_verified: bool
) -> FitmentResult:
    """The one deterministic, local check this phase adds.

    Always returns "unknown" for a vehicle the catalog hasn't verified —
    see callers (services/ai_service.py, services/mock_ai.py) and the
    product requirement this implements: an unverified or user-entered
    vehicle never gets aggressive rejection, because we're not confident
    enough in what it even IS to rule anything out.
    """
    if not vehicle_verified:
        return _UNKNOWN

    is_known_electric = (normalize_name(make), normalize_name(model)) in _KNOWN_ELECTRIC_MODELS
    if is_known_electric and _requires_ice_intake_or_exhaust(name, category):
        return FitmentResult(
            status="incompatible",
            reason="Requires an internal-combustion intake/exhaust system, which this vehicle (fully electric) does not have.",
            source="powertrain type (electric)",
        )

    return _UNKNOWN
