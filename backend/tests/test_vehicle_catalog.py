# tests/test_vehicle_catalog.py
#
# Covers the vehicle catalog service (services/vehicle_service.py), its
# read-only API (routers/vehicles.py), and the seed script's idempotency.
# Test fixtures build their own small catalog rows directly — this file is
# deliberately independent of scripts/seed_vehicle_catalog.py's actual
# curated content (which can change) except in the one test that exercises
# the seed script itself. See test_vehicle_production_ranges.py for the
# non-contiguous-production (Viper/NSX/Supra) scenarios against the real
# seeded catalog.

from fastapi import HTTPException

from models.vehicle import VehicleMake, VehicleModel, VehicleProductionRange
from services.vehicle_service import (
    VehicleCheckStatus,
    check_vehicle,
    list_active_makes,
    list_active_models_for_make,
    normalize_name,
)


def _make(db, name="Honda", is_active=True):
    m = VehicleMake(name=name, normalized_name=normalize_name(name), is_active=is_active)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def _range(db, model, start, end=None, is_active=True, generation_label=None):
    r = VehicleProductionRange(
        vehicle_model_id=model.id, generation_label=generation_label,
        production_year_start=start, production_year_end=end, is_active=is_active,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _model(db, make, name="Civic Type R", start=2017, end=2021, is_active=True, with_range=True):
    """Creates the VehicleModel and, unless with_range=False, one matching
    VehicleProductionRange — check_vehicle only ever consults the range
    table, so almost every test needs both."""
    mo = VehicleModel(
        make_id=make.id, name=name, normalized_name=normalize_name(name),
        production_year_start=start, production_year_end=end, is_active=is_active,
    )
    db.add(mo)
    db.commit()
    db.refresh(mo)
    if with_range:
        _range(db, mo, start=start, end=end)
    return mo


# ── normalize_name ───────────────────────────────────────────────────────────

def test_normalize_name_is_case_and_whitespace_insensitive():
    assert normalize_name("Mercedes-Benz") == normalize_name("  mercedes-benz  ")
    assert normalize_name("Civic   Type R") == normalize_name("civic type r")


# ── check_vehicle — the three-way status ────────────────────────────────────

def test_valid_make_model_year_is_verified(db):
    make = _make(db)
    _model(db, make, start=2017, end=2021)
    result = check_vehicle(db, "Honda", "Civic Type R", 2019)
    assert result.status is VehicleCheckStatus.VERIFIED


def test_year_below_production_range_is_invalid(db):
    make = _make(db)
    _model(db, make, start=2017, end=2021)
    result = check_vehicle(db, "Honda", "Civic Type R", 2010)
    assert result.status is VehicleCheckStatus.INVALID_YEAR


def test_year_above_production_range_is_invalid(db):
    make = _make(db)
    _model(db, make, start=2017, end=2021)
    result = check_vehicle(db, "Honda", "Civic Type R", 2030)
    assert result.status is VehicleCheckStatus.INVALID_YEAR


def test_known_model_with_unsupported_year_dodge_viper_example(db):
    """The scenario named in the product spec: a Dodge Viper does not exist
    as a 2026 model year (production ended in 2017)."""
    make = _make(db, name="Dodge")
    _model(db, make, name="Viper", start=1992, end=2017)
    result = check_vehicle(db, "Dodge", "Viper", 2026)
    assert result.status is VehicleCheckStatus.INVALID_YEAR


def test_model_still_in_production_has_no_upper_bound(db):
    make = _make(db)
    _model(db, make, name="Civic Si", start=1999, end=None)
    result = check_vehicle(db, "Honda", "Civic Si", 2026)
    assert result.status is VehicleCheckStatus.VERIFIED


def test_unknown_vehicle_is_unverified_not_rejected(db):
    result = check_vehicle(db, "Totally Fictional Make", "Made Up Model", 2020)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_known_make_unknown_model_is_unverified(db):
    _make(db)
    result = check_vehicle(db, "Honda", "Some Model Not In Catalog", 2020)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_inactive_make_is_treated_as_unverified(db):
    make = _make(db, is_active=False)
    _model(db, make, start=2017, end=2021)
    result = check_vehicle(db, "Honda", "Civic Type R", 2019)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_inactive_model_is_treated_as_unverified(db):
    make = _make(db)
    _model(db, make, is_active=False)
    result = check_vehicle(db, "Honda", "Civic Type R", 2019)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_model_with_no_active_ranges_is_unverified_not_invalid(db):
    """A model row that exists but has zero verified ranges (e.g. newly
    added, not yet backed by real data) has nothing to validate a year
    against — that's "not verified yet," not "known wrong"."""
    make = _make(db)
    _model(db, make, with_range=False)
    result = check_vehicle(db, "Honda", "Civic Type R", 2019)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_inactive_production_range_is_treated_as_unverified(db):
    """Deactivating a model's only range (bad data for that span) must not
    make every year for that model start resolving as verified OR get
    treated as a hard rejection — it falls back to "nothing to check
    against yet," same as a model with no ranges at all."""
    make = _make(db)
    model = _model(db, make, with_range=False)
    _range(db, model, start=2017, end=2021, is_active=False)
    result = check_vehicle(db, "Honda", "Civic Type R", 2019)
    assert result.status is VehicleCheckStatus.UNVERIFIED


def test_active_range_alongside_inactive_range_still_validates(db):
    """One bad range shouldn't poison a model's other, still-good range —
    and since the model DOES have at least one active range, a year that
    only falls in the deactivated one is a known mismatch (INVALID_YEAR),
    not "nothing to check against" (UNVERIFIED, reserved for a model with
    zero active ranges at all)."""
    make = _make(db)
    model = _model(db, make, name="Multi-range Model", with_range=False)
    _range(db, model, start=1990, end=1995, is_active=False)  # bad data, deactivated
    _range(db, model, start=2017, end=2021, is_active=True)
    assert check_vehicle(db, "Honda", "Multi-range Model", 1992).status is VehicleCheckStatus.INVALID_YEAR
    assert check_vehicle(db, "Honda", "Multi-range Model", 2019).status is VehicleCheckStatus.VERIFIED


# ── list_active_makes / list_active_models_for_make ─────────────────────────

def test_list_active_makes_excludes_inactive(db):
    _make(db, name="Honda", is_active=True)
    _make(db, name="Retired Make", is_active=False)
    names = [m.name for m in list_active_makes(db)]
    assert "Honda" in names
    assert "Retired Make" not in names


def test_list_active_models_excludes_inactive(db):
    make = _make(db)
    _model(db, make, name="Civic Type R", is_active=True)
    _model(db, make, name="Retired Trim", is_active=False)
    names = [m.name for m in list_active_models_for_make(db, "Honda")]
    assert "Civic Type R" in names
    assert "Retired Trim" not in names


def test_list_active_models_includes_production_ranges(db):
    make = _make(db)
    _model(db, make, name="Civic Type R", start=2017, end=2021)
    models = list_active_models_for_make(db, "Honda")
    assert len(models) == 1
    assert len(models[0].production_ranges) == 1
    r = models[0].production_ranges[0]
    assert (r.production_year_start, r.production_year_end, r.generation_label) == (2017, 2021, None)


def test_list_active_models_excludes_inactive_ranges(db):
    make = _make(db)
    model = _model(db, make, with_range=False)
    _range(db, model, start=1990, end=1995, is_active=False)
    _range(db, model, start=2017, end=2021, is_active=True)
    models = list_active_models_for_make(db, "Honda")
    assert len(models[0].production_ranges) == 1
    assert models[0].production_ranges[0].production_year_start == 2017


def test_list_active_models_for_unknown_make_raises_404(db):
    import pytest
    with pytest.raises(HTTPException) as exc_info:
        list_active_models_for_make(db, "Nonexistent Make")
    assert exc_info.value.status_code == 404


# ── API endpoints ────────────────────────────────────────────────────────────

def test_get_makes_endpoint(client, db):
    _make(db, name="Honda")
    resp = client.get("/api/vehicles/makes")
    assert resp.status_code == 200
    assert any(m["name"] == "Honda" for m in resp.json())


def test_get_models_endpoint(client, db):
    make = _make(db, name="Honda")
    _model(db, make, name="Civic Type R", start=2017, end=2021)
    resp = client.get("/api/vehicles/makes/Honda/models")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "Civic Type R"
    assert body[0]["production_ranges"] == [
        {"generation_label": None, "production_year_start": 2017, "production_year_end": 2021}
    ]
    # The old flat shape must be gone — keeping it alongside the ranges list
    # would re-open exactly the "looks continuous" bug this phase fixes.
    assert "production_year_start" not in body[0]
    assert "production_year_end" not in body[0]


def test_get_models_endpoint_shows_multiple_ranges_for_a_gapped_model(client, db):
    make = _make(db, name="Dodge")
    model = _model(db, make, name="Viper", with_range=False)
    _range(db, model, start=1992, end=1995, generation_label="1st gen")
    _range(db, model, start=1996, end=2002, generation_label="2nd gen")
    resp = client.get("/api/vehicles/makes/Dodge/models")
    ranges = resp.json()[0]["production_ranges"]
    assert len(ranges) == 2
    assert ranges[0]["production_year_start"] == 1992  # sorted oldest-first
    assert ranges[1]["production_year_start"] == 1996


def test_get_models_endpoint_unknown_make_is_404_not_500(client):
    resp = client.get("/api/vehicles/makes/Nonexistent/models")
    assert resp.status_code == 404


def test_lookup_endpoint_verified(client, db):
    make = _make(db, name="Honda")
    _model(db, make, name="Civic Type R", start=2017, end=2021)
    resp = client.get("/api/vehicles/lookup", params={"make": "Honda", "model": "Civic Type R", "year": 2019})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "verified"
    assert body["production_ranges"] == [
        {"generation_label": None, "production_year_start": 2017, "production_year_end": 2021}
    ]


def test_lookup_endpoint_invalid_year_lists_all_ranges(client, db):
    make = _make(db, name="Dodge")
    model = _model(db, make, name="Viper", with_range=False)
    _range(db, model, start=1992, end=1995)
    _range(db, model, start=2013, end=2017)
    resp = client.get("/api/vehicles/lookup", params={"make": "Dodge", "model": "Viper", "year": 2026})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "invalid_year"
    assert len(body["production_ranges"]) == 2
    assert "1992" in body["message"] and "2017" in body["message"]


def test_lookup_endpoint_unverified(client):
    resp = client.get("/api/vehicles/lookup", params={"make": "Nope", "model": "Nope", "year": 2020})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "unverified"
    assert body["production_ranges"] == []


# ── malformed requests ───────────────────────────────────────────────────────

def test_lookup_endpoint_rejects_non_integer_year(client):
    resp = client.get("/api/vehicles/lookup", params={"make": "Honda", "model": "Civic", "year": "not-a-year"})
    assert resp.status_code == 422


def test_lookup_endpoint_requires_all_params(client):
    resp = client.get("/api/vehicles/lookup", params={"make": "Honda"})
    assert resp.status_code == 422


def test_lookup_endpoint_rejects_year_out_of_bounds(client):
    resp = client.get("/api/vehicles/lookup", params={"make": "Honda", "model": "Civic", "year": 1800})
    assert resp.status_code == 422


# ── seed idempotency ─────────────────────────────────────────────────────────

def test_seed_script_is_idempotent(db):
    from scripts.seed_vehicle_catalog import seed

    first = seed(db)
    makes_after_first = db.query(VehicleMake).count()
    models_after_first = db.query(VehicleModel).count()
    ranges_after_first = db.query(VehicleProductionRange).count()

    second = seed(db)
    makes_after_second = db.query(VehicleMake).count()
    models_after_second = db.query(VehicleModel).count()
    ranges_after_second = db.query(VehicleProductionRange).count()

    assert first == second
    assert makes_after_first == makes_after_second
    assert models_after_first == models_after_second
    assert ranges_after_first == ranges_after_second
    # Sanity: the seed actually produced something, so the equality above
    # isn't trivially true from two empty runs.
    assert makes_after_first > 0
    assert models_after_first > 0
    assert ranges_after_first > 0
