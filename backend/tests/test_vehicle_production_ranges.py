# tests/test_vehicle_production_ranges.py
#
# Validates the actual seeded catalog's non-contiguous production ranges —
# complements test_vehicle_catalog.py (which tests the check_vehicle
# MECHANISM against small synthetic fixtures) by proving the real curated
# data in scripts/seed_vehicle_catalog.py correctly rejects years inside a
# real production gap for the vehicles named in the product spec: a
# continuous min/max span would incorrectly validate every one of these.

import pytest

from scripts.seed_vehicle_catalog import seed
from services.vehicle_service import VehicleCheckStatus, check_vehicle


@pytest.fixture(autouse=True)
def seeded(db):
    seed(db)


# ── Dodge Viper — five generations, real gaps between them (no Viper was
#    built in 2007, 2011, or 2012) ───────────────────────────────────────────

def test_viper_2010_is_valid_end_of_4th_generation(db):
    assert check_vehicle(db, "Dodge", "Viper", 2010).status is VehicleCheckStatus.VERIFIED


def test_viper_2011_is_invalid_gap_year(db):
    assert check_vehicle(db, "Dodge", "Viper", 2011).status is VehicleCheckStatus.INVALID_YEAR


def test_viper_2012_is_invalid_gap_year(db):
    """Real Viper production history has no 2011 or 2012 model year — the
    4th generation ended in 2010 and the 5th didn't start until 2013. A
    single continuous [1992, 2017] span (the old Phase 1 shape) would have
    incorrectly validated both of these."""
    assert check_vehicle(db, "Dodge", "Viper", 2012).status is VehicleCheckStatus.INVALID_YEAR


def test_viper_2013_is_valid_start_of_5th_generation(db):
    assert check_vehicle(db, "Dodge", "Viper", 2013).status is VehicleCheckStatus.VERIFIED


def test_viper_2026_is_invalid_discontinued(db):
    assert check_vehicle(db, "Dodge", "Viper", 2026).status is VehicleCheckStatus.INVALID_YEAR


def test_duplicate_seed_execution_preserves_viper_gap_detection(db):
    """Re-running the seed must not merge, duplicate, or otherwise corrupt
    the gap between generations."""
    seed(db)  # second run — the autouse `seeded` fixture already ran it once
    assert check_vehicle(db, "Dodge", "Viper", 2010).status is VehicleCheckStatus.VERIFIED
    assert check_vehicle(db, "Dodge", "Viper", 2011).status is VehicleCheckStatus.INVALID_YEAR
    assert check_vehicle(db, "Dodge", "Viper", 2013).status is VehicleCheckStatus.VERIFIED


# ── Acura/Honda NSX — one real ~10-year gap between generations ─────────────
# Sold as "Acura NSX" in North America and "Honda NSX" elsewhere — same car,
# same gap, seeded under both makes.

def test_nsx_during_the_production_gap_is_invalid(db):
    assert check_vehicle(db, "Acura", "NSX", 2010).status is VehicleCheckStatus.INVALID_YEAR
    assert check_vehicle(db, "Honda", "NSX", 2010).status is VehicleCheckStatus.INVALID_YEAR


def test_nsx_in_the_original_generation_is_valid(db):
    assert check_vehicle(db, "Acura", "NSX", 1995).status is VehicleCheckStatus.VERIFIED
    assert check_vehicle(db, "Honda", "NSX", 1995).status is VehicleCheckStatus.VERIFIED


def test_nsx_in_the_modern_generation_is_valid(db):
    assert check_vehicle(db, "Acura", "NSX", 2020).status is VehicleCheckStatus.VERIFIED
    assert check_vehicle(db, "Honda", "NSX", 2020).status is VehicleCheckStatus.VERIFIED


# ── Toyota Supra vs GR Supra — kept as two separate models (see seed file's
#    module docstring for why), not one model with a gap ───────────────────

def test_classic_supra_during_the_gap_is_invalid(db):
    assert check_vehicle(db, "Toyota", "Supra", 2010).status is VehicleCheckStatus.INVALID_YEAR


def test_classic_supra_in_its_own_range_is_valid(db):
    assert check_vehicle(db, "Toyota", "Supra", 1995).status is VehicleCheckStatus.VERIFIED


def test_gr_supra_in_its_modern_range_is_valid(db):
    assert check_vehicle(db, "Toyota", "GR Supra", 2020).status is VehicleCheckStatus.VERIFIED


def test_gr_supra_before_its_range_is_invalid(db):
    assert check_vehicle(db, "Toyota", "GR Supra", 2010).status is VehicleCheckStatus.INVALID_YEAR


# ── A normal continuous-production model, for contrast ──────────────────────

def test_continuous_model_every_sampled_year_in_range_is_valid(db):
    for year in (1999, 2010, 2020, 2026):
        assert check_vehicle(db, "Honda", "Civic Si", year).status is VehicleCheckStatus.VERIFIED


def test_continuous_model_before_its_start_is_invalid(db):
    assert check_vehicle(db, "Honda", "Civic Si", 1990).status is VehicleCheckStatus.INVALID_YEAR


# ── Unknown model / known model invalid year, against the real catalog ─────

def test_unknown_model_is_unverified_against_real_catalog(db):
    assert check_vehicle(db, "Honda", "Flying Civic", 2020).status is VehicleCheckStatus.UNVERIFIED


def test_known_model_invalid_year_against_real_catalog(db):
    assert check_vehicle(db, "Mazda", "RX-7", 2020).status is VehicleCheckStatus.INVALID_YEAR
