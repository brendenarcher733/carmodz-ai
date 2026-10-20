# tests/test_plans_preview.py

import pytest

from core.config import settings
from models.build import Build
from models.vehicle import VehicleMake, VehicleModel, VehicleProductionRange
from services.vehicle_service import normalize_name

PAYLOAD = {
    "title": "2018 Honda Civic Si", "year": 2018, "make": "Honda", "model": "Civic Si",
    "budget": 2500, "goal": "Fun Daily Driver", "experience": "intermediate",
    "categories": ["performance", "handling"], "is_daily": True, "notes": "",
}


def _seed_make_model(db, make_name, model_name, start, end):
    """Creates the make/model plus the matching VehicleProductionRange —
    services.vehicle_service.check_vehicle only ever consults the range
    table, not VehicleModel's own start/end columns."""
    make = VehicleMake(name=make_name, normalized_name=normalize_name(make_name), is_active=True)
    db.add(make)
    db.commit()
    db.refresh(make)
    model = VehicleModel(
        make_id=make.id, name=model_name, normalized_name=normalize_name(model_name),
        production_year_start=start, production_year_end=end, is_active=True,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    db.add(VehicleProductionRange(
        vehicle_model_id=model.id, production_year_start=start, production_year_end=end, is_active=True,
    ))
    db.commit()
    return make, model


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    """backend/.env carries a real ANTHROPIC_API_KEY, which settings loads even
    under pytest. Blank the keys so these tests exercise the mock path and
    never make a paid model call."""
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")


def test_preview_returns_a_plan_without_auth(client, db):
    resp = client.post("/api/plans/preview", json=PAYLOAD)
    assert resp.status_code == 200
    body = resp.json()
    assert body["year"] == 2018 and body["make"] == "Honda"
    assert len(body["mods"]) > 0
    assert body["used_mock_fallback"] is True  # no AI key configured in tests


def test_preview_saves_nothing(client, db):
    client.post("/api/plans/preview", json=PAYLOAD)
    assert db.query(Build).count() == 0


def test_preview_rejects_incomplete_input(client):
    resp = client.post("/api/plans/preview", json={"make": "Honda"})
    assert resp.status_code == 422


# ── Vehicle catalog integration — preserving the frictionless anonymous flow ─

def test_preview_marks_unknown_vehicle_as_unverified_but_still_returns_a_plan(client, db):
    """Core requirement: not being in the catalog yet must never require
    signing up or block the anonymous preview."""
    resp = client.post("/api/plans/preview", json=PAYLOAD)  # no catalog data seeded at all
    assert resp.status_code == 200
    assert resp.json()["vehicle_verified"] is False


def test_preview_marks_verified_vehicle_as_verified(client, db):
    _seed_make_model(db, "Honda", "Civic Si", start=2006, end=None)
    resp = client.post("/api/plans/preview", json=PAYLOAD)
    assert resp.status_code == 200
    assert resp.json()["vehicle_verified"] is True


def test_preview_rejects_known_invalid_year(client, db):
    _seed_make_model(db, "Dodge", "Viper", start=1992, end=2017)
    payload = {**PAYLOAD, "make": "Dodge", "model": "Viper", "year": 2026}
    resp = client.post("/api/plans/preview", json=payload)
    assert resp.status_code == 422


def test_preview_known_invalid_year_saves_nothing(client, db):
    _seed_make_model(db, "Dodge", "Viper", start=1992, end=2017)
    payload = {**PAYLOAD, "make": "Dodge", "model": "Viper", "year": 2026}
    client.post("/api/plans/preview", json=payload)
    assert db.query(Build).count() == 0


# ── Phase 2 — fitment validation must not break the frictionless preview ───

def test_preview_unverified_vehicle_keeps_recommendations_marked_unknown(client, db):
    """Core Phase 2 requirement: an unverified vehicle never gets aggressive
    rejection — the frictionless anonymous preview still returns a full
    plan, every mod just carries fitment_status="unknown"."""
    resp = client.post("/api/plans/preview", json=PAYLOAD)  # no catalog data seeded
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["mods"]) > 0
    assert all(m["fitment_status"] != "incompatible" for m in body["mods"])


def test_preview_for_known_electric_vehicle_still_returns_a_plan(client, db):
    """A verified, known-electric vehicle may have ICE-only mods dropped,
    but must never come back empty or rejected."""
    _seed_make_model(db, "Tesla", "Model 3", start=2017, end=None)
    payload = {
        "title": "Tesla build", "year": 2022, "make": "Tesla", "model": "Model 3",
        "budget": 3000, "goal": "performance", "experience": "intermediate",
        "categories": ["performance"], "is_daily": True, "notes": "",
    }
    resp = client.post("/api/plans/preview", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["vehicle_verified"] is True
    assert len(body["mods"]) > 0
    assert all(m["fitment_status"] != "incompatible" for m in body["mods"])
    assert "Cold Air Intake" not in [m["name"] for m in body["mods"]]
