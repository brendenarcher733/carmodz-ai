# tests/test_build_vehicle_verification.py
#
# Authenticated build creation's use of the vehicle catalog
# (services/build_service.create_build) plus the AI prompt disclaimer that
# fires for an unverified vehicle (services/ai_service._build_recommendations_prompt).
#
# Goes through services.build_service.create_build directly rather than the
# POST /api/builds/ HTTP endpoint — same pattern test_billing_usage_limits.py
# uses — since the endpoint also enqueues an arq job against a live Redis
# connection, which isn't what this file is testing.

import pytest
from fastapi import HTTPException

from conftest import make_user
from models.build import BuildCreate
from models.vehicle import VehicleMake, VehicleModel, VehicleProductionRange
from services.ai_service import _build_recommendations_prompt
from services.build_service import create_build
from services.vehicle_service import normalize_name


def _make(db, name="Honda"):
    m = VehicleMake(name=name, normalized_name=normalize_name(name), is_active=True)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def _model(db, make, name="Civic Type R", start=2017, end=2021):
    """Creates both the VehicleModel and its matching VehicleProductionRange
    — services.vehicle_service.check_vehicle only ever consults the range
    table (see test_vehicle_catalog.py / test_vehicle_production_ranges.py
    for the non-contiguous-range cases)."""
    mo = VehicleModel(
        make_id=make.id, name=name, normalized_name=normalize_name(name),
        production_year_start=start, production_year_end=end, is_active=True,
    )
    db.add(mo)
    db.commit()
    db.refresh(mo)
    db.add(VehicleProductionRange(
        vehicle_model_id=mo.id, production_year_start=start, production_year_end=end, is_active=True,
    ))
    db.commit()
    return mo


def _build_data(**overrides):
    base = dict(
        title="Test Build", year=2019, make="Honda", model="Civic Type R",
        budget=5000, goal="performance", experience="intermediate",
        categories=["performance"], is_daily=True, notes="",
    )
    base.update(overrides)
    return BuildCreate(**base)


def test_verified_vehicle_is_accepted_and_marked_verified(db):
    user = make_user(db, email="verified@example.com")
    make = _make(db)
    _model(db, make, start=2017, end=2021)

    build = create_build(db, _build_data(year=2019), user)

    assert build.vehicle_verified is True


def test_invalid_year_is_rejected_with_422(db):
    user = make_user(db, email="invalid-year@example.com")
    make = _make(db, name="Dodge")
    _model(db, make, name="Viper", start=1992, end=2017)

    with pytest.raises(HTTPException) as exc_info:
        create_build(db, _build_data(make="Dodge", model="Viper", year=2026), user)

    assert exc_info.value.status_code == 422


def test_unverified_vehicle_is_allowed_and_marked_unverified(db):
    user = make_user(db, email="unverified@example.com")
    # No catalog data at all for this make/model.
    build = create_build(db, _build_data(make="Yugo", model="GV", year=1986), user)

    assert build.vehicle_verified is False
    assert build.status == "pending"  # build creation still succeeded


def test_invalid_year_does_not_create_a_build_row(db):
    from models.build import Build

    user = make_user(db, email="no-row@example.com")
    make = _make(db, name="Dodge")
    _model(db, make, name="Viper", start=1992, end=2017)

    before = db.query(Build).count()
    with pytest.raises(HTTPException):
        create_build(db, _build_data(make="Dodge", model="Viper", year=2026), user)
    after = db.query(Build).count()

    assert after == before


# ── AI prompt must not imply exact fitment for an unverified vehicle ────────

def test_prompt_includes_fitment_disclaimer_when_unverified():
    build = type("FakeBuild", (), {
        "year": 1986, "make": "Yugo", "model": "GV", "budget": 2000.0,
        "goal": "budget performance", "experience": "beginner",
        "categories": ["performance"], "is_daily": True, "notes": "",
    })()
    prompt = _build_recommendations_prompt(build, vehicle_verified=False)
    assert "not in our verified vehicle catalog" in prompt
    assert "Do not claim guaranteed exact fitment" in prompt


def test_prompt_omits_disclaimer_when_verified():
    build = type("FakeBuild", (), {
        "year": 2019, "make": "Honda", "model": "Civic Type R", "budget": 5000.0,
        "goal": "performance", "experience": "intermediate",
        "categories": ["performance"], "is_daily": True, "notes": "",
    })()
    prompt = _build_recommendations_prompt(build, vehicle_verified=True)
    assert "not in our verified vehicle catalog" not in prompt


def test_prompt_defaults_to_verified_for_backward_compatibility():
    """Existing callers (evals, anything not yet catalog-aware) that don't
    pass vehicle_verified at all must see identical prompt behavior to
    before this feature existed."""
    build = type("FakeBuild", (), {
        "year": 2019, "make": "Honda", "model": "Civic Type R", "budget": 5000.0,
        "goal": "performance", "experience": "intermediate",
        "categories": ["performance"], "is_daily": True, "notes": "",
    })()
    assert _build_recommendations_prompt(build) == _build_recommendations_prompt(build, vehicle_verified=True)
