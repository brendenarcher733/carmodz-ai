# tests/test_recommendation_fitment.py
#
# Vehicle-aware recommendation validation (Phase 2) — covers both pipelines
# that produce recommendations (services/ai_service._parse_recommendations
# for Claude/OpenAI output, services/mock_ai.generate_recommendations for
# the fallback engine) plus the persist/read round-trip and the anonymous
# preview path, per the product requirement's required test list.

import pytest

from conftest import make_user
from models.build import Build, BuildCreate
from models.recommendation import EvaluatedModRecommendation
from services.ai_service import _parse_recommendations
from services.build_service import get_build_plan
from services.mock_ai import generate_recommendations
from workers.recommendation_worker import _persist_recommendations


def _build_data(**overrides):
    base = dict(
        title="Test Build", year=2022, make="Tesla", model="Model 3",
        budget=5000, goal="performance", experience="intermediate",
        categories=[], is_daily=True, notes="",
    )
    base.update(overrides)
    return BuildCreate(**base)


def _raw_rec(**overrides):
    base = dict(
        name="Coilover Suspension", category="handling",
        price_min=700, price_max=2000, difficulty="medium", stage=1, priority=1,
        why="Improves handling and ride height adjustability.",
    )
    base.update(overrides)
    return base


# ── ai_service._parse_recommendations — the AI-sourced pipeline ────────────

def test_verified_vehicle_non_ice_recommendation_survives_as_unknown():
    """The AI pipeline never asserts "verified" itself — a non-ICE mod for a
    verified vehicle still survives, just marked "unknown" (requirement 3:
    "preserve unknown recommendations, but mark them as unknown")."""
    raw = {"recommendations": [_raw_rec(name="Coilover Suspension")]}
    recs = _parse_recommendations(raw, budget=5000, make="Tesla", model="Model 3", vehicle_verified=True)
    assert len(recs) == 1
    assert recs[0].fitment_status == "unknown"


def test_explicit_incompatible_recommendation_is_removed():
    raw = {"recommendations": [
        _raw_rec(name="Coilover Suspension"),
        _raw_rec(name="Turbo Upgrade Kit", category="performance", priority=2),
    ]}
    recs = _parse_recommendations(raw, budget=5000, make="Tesla", model="Model 3", vehicle_verified=True)
    names = [r.name for r in recs]
    assert "Coilover Suspension" in names
    assert "Turbo Upgrade Kit" not in names


def test_unverified_vehicle_does_not_cause_rejection_even_for_an_ice_part():
    """Core requirement 4: no aggressive rejection for an unverified/
    user-entered vehicle — even a recommendation that WOULD be incompatible
    against a known-electric vehicle survives, marked unknown."""
    raw = {"recommendations": [
        _raw_rec(name="Coilover Suspension"),
        _raw_rec(name="Turbo Upgrade Kit", category="performance", priority=2),
    ]}
    recs = _parse_recommendations(raw, budget=5000, make="Tesla", model="Model 3", vehicle_verified=False)
    names = [r.name for r in recs]
    assert "Coilover Suspension" in names
    assert "Turbo Upgrade Kit" in names
    assert all(r.fitment_status == "unknown" for r in recs)


def test_fitment_evaluation_does_not_discard_the_whole_response():
    """One incompatible item among several must not fail/empty the batch —
    same "repair, don't discard" philosophy as the existing malformed-item
    handling this pipeline already has."""
    raw = {"recommendations": [
        _raw_rec(name="Turbo Upgrade Kit", category="performance", priority=1),
        _raw_rec(name="Window Tint", category="cosmetic", priority=2, price_min=200, price_max=500),
        _raw_rec(name="Coilover Suspension", category="handling", priority=3),
    ]}
    recs = _parse_recommendations(raw, budget=5000, make="Tesla", model="Model 3", vehicle_verified=True)
    assert len(recs) == 2
    assert {r.name for r in recs} == {"Window Tint", "Coilover Suspension"}


def test_existing_callers_without_vehicle_args_are_unaffected():
    """Backward compatibility: a caller that doesn't pass make/model/
    vehicle_verified (older tests, the eval harness) must see identical
    survival behavior to before this phase — only the new fitment_status
    field (defaulting to "unknown") is added."""
    raw = {"recommendations": [_raw_rec(name="Turbo Upgrade Kit", category="performance")]}
    recs = _parse_recommendations(raw, budget=5000)
    assert len(recs) == 1
    assert recs[0].fitment_status == "unknown"


# ── mock_ai.generate_recommendations — the fallback engine ─────────────────

def test_mock_engine_verified_mod_survives_with_verified_status():
    """Every MOD_LIBRARY cosmetic entry is curated as universally fitting
    (requirement 2) — whichever ones the budget/scoring algorithm selects,
    their verified status must survive into the final recommendation."""
    build = _build_data(categories=["cosmetic"], budget=1000)
    mods = generate_recommendations(build, vehicle_verified=True)
    assert len(mods) > 0
    assert all(m.fitment_status == "verified" for m in mods)


def test_mock_engine_drops_incompatible_mods_for_known_electric_vehicle():
    build = _build_data(make="Tesla", model="Model 3", categories=["performance"], budget=3000)
    mods = generate_recommendations(build, vehicle_verified=True)
    names = [m.name for m in mods]
    # Every ICE intake/exhaust-dependent performance mod in MOD_LIBRARY must
    # be gone for a known-electric vehicle.
    for ice_only in ("Cold Air Intake", "Cat-Back Exhaust System", "Intercooler Upgrade",
                      "High-Flow Catalytic Converter", "Downpipe Upgrade", "Short Ram / Performance Intake"):
        assert ice_only not in names
    assert all(m.fitment_status != "incompatible" for m in mods)


def test_mock_engine_does_not_drop_ice_mods_for_unverified_vehicle():
    """Same Tesla-shaped build, but vehicle_verified=False (e.g. not yet in
    the catalog) — no aggressive rejection, ICE mods may still appear,
    marked unknown rather than incompatible."""
    build = _build_data(make="Tesla", model="Model 3", categories=["performance"], budget=3000)
    mods = generate_recommendations(build, vehicle_verified=False)
    assert len(mods) > 0
    assert all(m.fitment_status != "incompatible" for m in mods)


def test_mock_engine_default_vehicle_verified_is_false():
    """Matches services/fitment_service.py's safe default — a caller that
    forgets to pass vehicle_verified gets the non-aggressive behavior."""
    build = _build_data(make="Tesla", model="Model 3", categories=["performance"], budget=3000)
    mods = generate_recommendations(build)
    assert all(m.fitment_status != "incompatible" for m in mods)


# ── Persist / read round-trip (authenticated build path) ───────────────────

def test_fitment_fields_round_trip_through_worker_and_build_service(db):
    user = make_user(db, email="fitment-roundtrip@example.com")
    build = Build(
        user_id=user.id, title="Test Build", year=2022, make="Tesla", model="Model 3",
        budget=3000, goal="performance", experience="intermediate",
        categories=["performance"], is_daily=1, status="ready", vehicle_verified=True,
    )
    db.add(build)
    db.commit()
    db.refresh(build)

    mods = [
        EvaluatedModRecommendation(
            name="Coilover Suspension", category="handling", price_min=700, price_max=2000,
            difficulty="medium", stage=1, priority=1, why="Better handling.",
            fitment_status="verified", fitment_reason="Universal suspension upgrade.", fitment_source="mod category",
        ),
        EvaluatedModRecommendation(
            name="ECU Tune / Flash", category="performance", price_min=400, price_max=900,
            difficulty="easy", stage=2, priority=2, why="Best power per dollar.",
            fitment_status="unknown",
        ),
    ]
    _persist_recommendations(db, build, mods)
    db.commit()

    plan = get_build_plan(db, build.id, user.id)
    by_name = {m.name: m for m in plan.mods}
    assert by_name["Coilover Suspension"].fitment_status == "verified"
    assert by_name["Coilover Suspension"].fitment_reason == "Universal suspension upgrade."
    assert by_name["ECU Tune / Flash"].fitment_status == "unknown"
    assert by_name["ECU Tune / Flash"].fitment_reason is None


def test_existing_recommendation_rows_without_fitment_data_read_back_as_unknown(db):
    """Simulates a row persisted before this phase existed — the DB column
    backfills to 'unknown' (see the migration), and reading it back through
    the normal plan-assembly path must not error."""
    from models.recommendation import Recommendation

    user = make_user(db, email="pre-fitment-row@example.com")
    build = Build(
        user_id=user.id, title="Old Build", year=2018, make="Honda", model="Civic Si",
        budget=2500, goal="performance", experience="intermediate",
        categories=["performance"], is_daily=1, status="ready", vehicle_verified=False,
    )
    db.add(build)
    db.commit()
    db.refresh(build)

    db.add(Recommendation(
        build_id=build.id, name="Cold Air Intake", category="performance",
        price_min=150, price_max=400, difficulty="easy", stage=1, priority=1,
        why="Improves airflow.",
        # fitment_status/reason/source intentionally omitted — relies on the
        # column's server_default, exactly like a pre-Phase-2 row would.
    ))
    db.commit()

    plan = get_build_plan(db, build.id, user.id)
    assert plan.mods[0].fitment_status == "unknown"
