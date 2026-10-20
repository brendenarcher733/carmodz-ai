# tests/test_fitment_service.py
#
# Pure unit tests for services/fitment_service.evaluate_fitment — the one
# deterministic, local rule Phase 2 adds: an ICE intake/exhaust-dependent
# recommendation is incompatible with a vehicle we're confident is fully
# electric. Everything else stays "unknown" — this module never produces
# "verified" on its own (that only ever comes from curated data).

from services.fitment_service import evaluate_fitment


def test_unverified_vehicle_is_always_unknown_even_for_an_ice_only_part():
    """Core Phase 2 requirement: an unverified/user-entered vehicle never
    gets aggressive rejection — the incompatibility check doesn't even run."""
    result = evaluate_fitment(
        name="Turbo Kit", category="performance",
        make="Tesla", model="Model 3", vehicle_verified=False,
    )
    assert result.status == "unknown"
    assert result.reason is None


def test_ice_part_on_known_electric_vehicle_is_incompatible():
    result = evaluate_fitment(
        name="Intercooler Upgrade", category="performance",
        make="Tesla", model="Model 3", vehicle_verified=True,
    )
    assert result.status == "incompatible"
    assert result.reason is not None
    assert result.source is not None


def test_exhaust_part_on_known_electric_vehicle_is_incompatible():
    result = evaluate_fitment(
        name="Cat-Back Exhaust System", category="performance",
        make="Tesla", model="Model Y", vehicle_verified=True,
    )
    assert result.status == "incompatible"


def test_matching_is_case_and_whitespace_insensitive_on_make_model():
    result = evaluate_fitment(
        name="Cold Air Intake", category="performance",
        make="  tesla  ", model="MODEL 3", vehicle_verified=True,
    )
    assert result.status == "incompatible"


def test_ice_part_on_non_electric_verified_vehicle_is_unknown_not_incompatible():
    """We don't have engine data for a Honda Civic Si — an intake upgrade is
    genuinely uncertain, not confidently wrong, so it stays unknown."""
    result = evaluate_fitment(
        name="Cold Air Intake", category="performance",
        make="Honda", model="Civic Si", vehicle_verified=True,
    )
    assert result.status == "unknown"


def test_non_ice_part_on_known_electric_vehicle_is_unknown():
    """Coilovers have nothing to do with intake/exhaust — no reason to flag
    them for an EV."""
    result = evaluate_fitment(
        name="Coilover Suspension", category="handling",
        make="Tesla", model="Model 3", vehicle_verified=True,
    )
    assert result.status == "unknown"


def test_electric_vehicle_not_in_the_known_set_is_unknown():
    """Deliberately narrow: this is not a general EV detector. A real EV
    outside our small curated set gets "unknown" (a false negative), never
    an invented "incompatible" claim."""
    result = evaluate_fitment(
        name="Turbo Kit", category="performance",
        make="Nissan", model="Leaf", vehicle_verified=True,
    )
    assert result.status == "unknown"


def test_evaluate_fitment_never_returns_verified():
    """This module only ever produces unknown/incompatible — "verified" is
    exclusively curated (services/mock_ai.MOD_LIBRARY)."""
    cases = [
        ("Turbo Kit", "performance", "Tesla", "Model 3", True),
        ("Turbo Kit", "performance", "Tesla", "Model 3", False),
        ("Coilover Suspension", "handling", "Honda", "Civic Si", True),
        ("Window Tint", "cosmetic", "Unknown Make", "Unknown Model", False),
    ]
    for name, category, make, model, verified in cases:
        result = evaluate_fitment(name=name, category=category, make=make, model=model, vehicle_verified=verified)
        assert result.status != "verified"
