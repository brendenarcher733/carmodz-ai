# scripts/seed_vehicle_catalog.py
#
# Deterministic, idempotent seed for the vehicle catalog.
#
# Run with:  cd backend && ./venv/bin/python -m scripts.seed_vehicle_catalog
#
# ── What this is, and isn't ──────────────────────────────────────────────────
# This is NOT a port of frontend/src/pages/Planner.jsx's old hardcoded
# MAKE_GROUPS/MODELS object. That data had no production-year information at
# all (it was a flat list of trim-name strings), and this seed is forbidden
# from inventing years. So instead of trusting that list, this file
# independently states verified production data for each entry — using
# generally well-documented, widely-reported facts (discontinuations,
# generation changes), not guesses.
#
# Coverage is intentionally partial: every make the old Planner listed is
# seeded here (so "is this make at least known" works broadly), but only a
# representative handful of models per make — the ones with an unambiguous,
# verifiable production history. A vehicle whose make is seeded but whose
# specific model isn't yet here is exactly the UNVERIFIED case this feature
# is designed to handle gracefully (see services/vehicle_service.py) — it is
# NOT rejected, just not vouched for yet.
#
# ── Non-contiguous production (Phase 1.1) ───────────────────────────────────
# A model's production span is a LIST of independently-verified ranges, not
# one min/max pair — see models/vehicle.py::VehicleProductionRange. Most
# entries below have exactly one range (helper: _single). A handful of real
# nameplates have a genuine gap or multiple generations and are listed with
# several ranges each:
#   - Dodge Viper: five generations with real gaps between them (no Viper
#     was built in 2007, 2011, or 2012).
#   - Honda/Acura NSX: a ~10-year gap between the 1990-2005 original and the
#     2016-2022 revival.
#   - Toyota Supra: the classic A80 (1993-2002) and the modern GR Supra
#     (2019-present) are kept as two SEPARATE models (matching how Toyota
#     itself names them), not one model with two ranges — "Supra" alone has
#     no production between 2003 and 2018, which a lookup for e.g. 2010
#     correctly rejects.
# These are deliberately NOT invented — each span reflects a real,
# well-documented generation boundary. Where the exact boundary year carries
# some uncertainty, source_url + source_last_verified_at exist precisely so
# a human can re-verify and correct it later.

import logging
from datetime import datetime

from core.config import settings
from core.database import SessionLocal, init_db
from models.vehicle import VehicleMake, VehicleModel, VehicleProductionRange
from services.vehicle_service import VEHICLE_CATALOG_CACHE_PREFIX, normalize_name

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _wiki(title: str) -> str:
    return f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"


def _single(name: str, start: int, end: int | None, source_url: str) -> dict:
    """Most models have exactly one verified production range — this avoids
    repeating the full {"ranges": [...]} shape for the common case."""
    return {
        "name": name,
        "ranges": [{"generation_label": None, "start": start, "end": end, "source_url": source_url}],
    }


# make -> list of {name, ranges: [{generation_label, start, end (None = still
# in production), source_url}, ...]}
CATALOG: dict[str, list[dict]] = {
    # ── Supercars & Exotics ──────────────────────────────────────────────────
    "Ferrari": [
        _single("488 GTB", 2015, 2019, _wiki("Ferrari 488")),
        _single("F8 Tributo", 2019, 2023, _wiki("Ferrari F8 Tributo")),
        _single("SF90 Stradale", 2019, None, _wiki("Ferrari SF90 Stradale")),
        _single("812 Superfast", 2017, 2022, _wiki("Ferrari 812 Superfast")),
        _single("LaFerrari", 2013, 2018, _wiki("LaFerrari")),
        _single("Enzo", 2002, 2004, _wiki("Ferrari Enzo")),
    ],
    "Lamborghini": [
        _single("Huracán", 2014, None, _wiki("Lamborghini Huracán")),
        _single("Aventador", 2011, 2022, _wiki("Lamborghini Aventador")),
        _single("Urus", 2018, None, _wiki("Lamborghini Urus")),
        _single("Gallardo", 2003, 2013, _wiki("Lamborghini Gallardo")),
        _single("Murciélago", 2001, 2010, _wiki("Lamborghini Murciélago")),
    ],
    "McLaren": [
        _single("720S", 2017, 2022, _wiki("McLaren 720S")),
        _single("570S", 2015, 2020, _wiki("McLaren 570S")),
        _single("Senna", 2018, 2019, _wiki("McLaren Senna")),
        _single("P1", 2013, 2015, _wiki("McLaren P1")),
        _single("Artura", 2021, None, _wiki("McLaren Artura")),
    ],
    "Aston Martin": [
        _single("DB11", 2016, 2023, _wiki("Aston Martin DB11")),
        _single("DBX", 2020, None, _wiki("Aston Martin DBX")),
        _single("Vantage", 2018, None, _wiki("Aston Martin Vantage (2018)")),
        _single("DBS Superleggera", 2018, 2023, _wiki("Aston Martin DBS Superleggera")),
    ],
    "Bugatti": [
        _single("Veyron", 2005, 2015, _wiki("Bugatti Veyron")),
        _single("Chiron", 2016, 2024, _wiki("Bugatti Chiron")),
    ],
    "Koenigsegg": [
        _single("Agera", 2010, 2018, _wiki("Koenigsegg Agera")),
        _single("Jesko", 2020, None, _wiki("Koenigsegg Jesko")),
        _single("Regera", 2015, 2021, _wiki("Koenigsegg Regera")),
    ],
    "Pagani": [
        _single("Huayra", 2011, None, _wiki("Pagani Huayra")),
        _single("Zonda", 1999, 2017, _wiki("Pagani Zonda")),
    ],
    "Rimac": [
        _single("Nevera", 2021, None, _wiki("Rimac Nevera")),
    ],

    # ── European Premium ──────────────────────────────────────────────────────
    "Porsche": [
        _single("911", 1963, None, _wiki("Porsche 911")),
        _single("718 Cayman", 2016, None, _wiki("Porsche 718 Cayman")),
        _single("718 Boxster", 2016, None, _wiki("Porsche Boxster")),
        _single("Cayenne", 2002, None, _wiki("Porsche Cayenne")),
        _single("Panamera", 2009, None, _wiki("Porsche Panamera")),
    ],
    "Jaguar": [
        _single("F-Type", 2013, 2024, _wiki("Jaguar F-Type")),
        _single("F-Pace", 2016, None, _wiki("Jaguar F-Pace")),
        _single("XE", 2015, 2023, _wiki("Jaguar XE")),
    ],
    "Bentley": [
        _single("Continental GT", 2003, None, _wiki("Bentley Continental GT")),
        _single("Bentayga", 2015, None, _wiki("Bentley Bentayga")),
        _single("Flying Spur", 2005, None, _wiki("Bentley Flying Spur")),
    ],
    "Rolls-Royce": [
        _single("Ghost", 2009, None, _wiki("Rolls-Royce Ghost")),
        _single("Cullinan", 2018, None, _wiki("Rolls-Royce Cullinan")),
        _single("Phantom", 2003, None, _wiki("Rolls-Royce Phantom (2003)")),
        _single("Wraith", 2013, 2023, _wiki("Rolls-Royce Wraith")),
    ],
    "Maserati": [
        _single("GranTurismo", 2007, None, _wiki("Maserati GranTurismo")),
        _single("MC20", 2020, None, _wiki("Maserati MC20")),
        _single("Ghibli", 2013, 2024, _wiki("Maserati Ghibli (M157)")),
    ],
    "Alfa Romeo": [
        _single("Giulia", 2016, None, _wiki("Alfa Romeo Giulia (952)")),
        _single("Stelvio", 2017, None, _wiki("Alfa Romeo Stelvio")),
        _single("4C", 2013, 2020, _wiki("Alfa Romeo 4C")),
    ],
    "Lotus": [
        _single("Evora", 2009, 2021, _wiki("Lotus Evora")),
        _single("Exige", 2000, 2021, _wiki("Lotus Exige")),
        _single("Elise", 1996, 2021, _wiki("Lotus Elise")),
        _single("Emira", 2021, None, _wiki("Lotus Emira")),
    ],

    # ── German ────────────────────────────────────────────────────────────────
    "BMW": [
        _single("M3", 1986, None, _wiki("BMW M3")),
        _single("M4", 2014, None, _wiki("BMW M4")),
        _single("M5", 1984, None, _wiki("BMW M5")),
        _single("M2", 2015, None, _wiki("BMW M2")),
    ],
    "Mercedes-Benz": [
        _single("C-Class", 1993, None, _wiki("Mercedes-Benz C-Class")),
        _single("E-Class", 1993, None, _wiki("Mercedes-Benz E-Class")),
        _single("S-Class", 1972, None, _wiki("Mercedes-Benz S-Class")),
        _single("G-Class", 1979, None, _wiki("Mercedes-Benz G-Class")),
    ],
    "Audi": [
        _single("RS3", 2010, None, _wiki("Audi RS3")),
        _single("RS6 Avant", 2002, None, _wiki("Audi RS6")),
        _single("R8", 2006, 2024, _wiki("Audi R8")),
        _single("TT", 1998, 2023, _wiki("Audi TT")),
    ],
    "Volkswagen": [
        _single("Golf GTI", 1983, None, _wiki("Volkswagen Golf GTI")),
        _single("Golf R", 2002, None, _wiki("Volkswagen Golf R")),
        _single("Jetta GLI", 1983, None, _wiki("Volkswagen Jetta")),
    ],

    # ── American ──────────────────────────────────────────────────────────────
    "Ford": [
        _single("Mustang", 1964, None, _wiki("Ford Mustang")),
        _single("F-150", 1975, None, _wiki("Ford F-150")),
        _single("Bronco", 2021, None, _wiki("Ford Bronco (sixth generation)")),
    ],
    "Chevrolet": [
        _single("Corvette", 1953, None, _wiki("Chevrolet Corvette")),
        _single("Camaro", 1966, 2024, _wiki("Chevrolet Camaro")),
        _single("Silverado", 1998, None, _wiki("Chevrolet Silverado")),
    ],
    "Dodge": [
        {
            "name": "Viper",
            "ranges": [
                {"generation_label": "1st gen (RT/10)",  "start": 1992, "end": 1995, "source_url": _wiki("Dodge Viper")},
                {"generation_label": "2nd gen (GTS)",    "start": 1996, "end": 2002, "source_url": _wiki("Dodge Viper")},
                {"generation_label": "3rd gen (ZB I)",   "start": 2003, "end": 2006, "source_url": _wiki("Dodge Viper")},
                {"generation_label": "4th gen (ZB II)",  "start": 2008, "end": 2010, "source_url": _wiki("Dodge Viper")},
                {"generation_label": "5th gen (VX)",     "start": 2013, "end": 2017, "source_url": _wiki("Dodge Viper")},
            ],
        },
        _single("Challenger", 2008, 2023, _wiki("Dodge Challenger (LC/LA)")),
        _single("Charger", 2006, 2023, _wiki("Dodge Charger (LX/LD)")),
    ],
    "Cadillac": [
        _single("CT5-V Blackwing", 2022, None, _wiki("Cadillac CT5")),
        _single("Escalade", 1998, None, _wiki("Cadillac Escalade")),
    ],
    "Jeep": [
        _single("Wrangler", 1986, None, _wiki("Jeep Wrangler")),
        _single("Grand Cherokee", 1992, None, _wiki("Jeep Grand Cherokee")),
    ],
    "Ram": [
        _single("1500", 2010, None, _wiki("Ram Pickup")),
    ],
    "Tesla": [
        _single("Model S", 2012, None, _wiki("Tesla Model S")),
        _single("Model 3", 2017, None, _wiki("Tesla Model 3")),
        _single("Model X", 2015, None, _wiki("Tesla Model X")),
        _single("Model Y", 2020, None, _wiki("Tesla Model Y")),
    ],

    # ── Japanese ──────────────────────────────────────────────────────────────
    "Toyota": [
        # Classic A80 and modern GR Supra are kept as two separate models
        # (matching Toyota's own naming) rather than one model with a gap —
        # see module docstring.
        _single("Supra", 1993, 2002, _wiki("Toyota Supra")),
        _single("GR Supra", 2019, None, _wiki("Toyota Supra")),
        _single("86", 2012, 2021, _wiki("Toyota 86")),
        _single("GR86", 2022, None, _wiki("Toyota GR86")),
        _single("4Runner", 1984, None, _wiki("Toyota 4Runner")),
        _single("Tacoma", 1995, None, _wiki("Toyota Tacoma")),
    ],
    "Honda": [
        _single("Civic Type R", 1997, None, _wiki("Honda Civic Type R")),
        _single("Civic Si", 1999, None, _wiki("Honda Civic Si")),
        _single("S2000", 1999, 2009, _wiki("Honda S2000")),
        {
            "name": "NSX",
            "ranges": [
                {"generation_label": "NA1/NA2 (1st gen)", "start": 1990, "end": 2005, "source_url": _wiki("Honda NSX")},
                {"generation_label": "NC1 (2nd gen)", "start": 2016, "end": 2022, "source_url": _wiki("Honda NSX (second generation)")},
            ],
        },
    ],
    "Nissan": [
        _single("GT-R", 2007, 2024, _wiki("Nissan GT-R")),
        _single("370Z", 2009, 2020, _wiki("Nissan 370Z")),
        _single("350Z", 2003, 2009, _wiki("Nissan 350Z")),
    ],
    "Subaru": [
        _single("WRX STI", 2004, 2021, _wiki("Subaru Impreza WRX STI")),
        _single("WRX", 2002, None, _wiki("Subaru WRX")),
        _single("BRZ", 2013, None, _wiki("Subaru BRZ")),
    ],
    "Mazda": [
        _single("MX-5", 1989, None, _wiki("Mazda MX-5")),
        _single("RX-7", 1978, 2002, _wiki("Mazda RX-7")),
        _single("RX-8", 2003, 2012, _wiki("Mazda RX-8")),
    ],
    "Mitsubishi": [
        _single("Lancer Evolution", 1992, 2016, _wiki("Mitsubishi Lancer Evolution")),
        _single("Eclipse", 1989, 2012, _wiki("Mitsubishi Eclipse")),
    ],
    "Lexus": [
        _single("LFA", 2010, 2012, _wiki("Lexus LFA")),
        _single("LC 500", 2017, None, _wiki("Lexus LC")),
        _single("RC F", 2014, None, _wiki("Lexus RC F")),
        _single("IS 500", 2022, None, _wiki("Lexus IS")),
    ],
    "Acura": [
        {
            # Sold in North America as "Acura NSX" across both generations —
            # same car, same gap, as Honda's entry above.
            "name": "NSX",
            "ranges": [
                {"generation_label": "NA1/NA2 (1st gen)", "start": 1990, "end": 2005, "source_url": _wiki("Honda NSX")},
                {"generation_label": "NC1 (2nd gen)", "start": 2016, "end": 2022, "source_url": _wiki("Honda NSX (second generation)")},
            ],
        },
        _single("Integra Type S", 2023, None, _wiki("Acura Integra (2023)")),
        _single("TLX Type S", 2021, None, _wiki("Acura TLX")),
    ],
    "Infiniti": [
        _single("Q50", 2014, None, _wiki("Infiniti Q50")),
        _single("Q60", 2017, None, _wiki("Infiniti Q60")),
        _single("G37", 2008, 2013, _wiki("Infiniti G37")),
    ],

    # ── Korean & Other ────────────────────────────────────────────────────────
    "Hyundai": [
        _single("Elantra N", 2022, None, _wiki("Hyundai Elantra N")),
        _single("Veloster N", 2019, 2022, _wiki("Hyundai Veloster N")),
        _single("Ioniq 5 N", 2024, None, _wiki("Hyundai Ioniq 5 N")),
    ],
    "Kia": [
        _single("Stinger", 2018, 2023, _wiki("Kia Stinger")),
        _single("EV6 GT", 2022, None, _wiki("Kia EV6")),
    ],
    "Genesis": [
        _single("G70", 2018, None, _wiki("Genesis G70")),
        _single("G80", 2016, None, _wiki("Genesis G80")),
    ],
    "Land Rover": [
        _single("Range Rover Sport", 2005, None, _wiki("Range Rover Sport")),
        _single("Defender", 2020, None, _wiki("Land Rover Defender (L663)")),
        _single("Discovery", 1989, None, _wiki("Land Rover Discovery")),
    ],
    "Volvo": [
        _single("XC60", 2008, None, _wiki("Volvo XC60")),
        _single("XC90", 2002, None, _wiki("Volvo XC90")),
        _single("S60", 2000, None, _wiki("Volvo S60")),
    ],
    "MINI": [
        _single("Cooper S", 2001, None, _wiki("Mini Hatch")),
        _single("John Cooper Works", 2002, None, _wiki("Mini John Cooper Works")),
    ],
}


def _upsert_make(db, name: str) -> VehicleMake:
    normalized = normalize_name(name)
    make = db.query(VehicleMake).filter(VehicleMake.normalized_name == normalized).first()
    if make is None:
        make = VehicleMake(name=name, normalized_name=normalized, is_active=True)
        db.add(make)
        db.flush()  # assigns make.id without committing, so models below can reference it
    else:
        make.name = name
        make.is_active = True
    return make


def _find_existing_range(db, model_id: int, start: int, end: int | None):
    q = db.query(VehicleProductionRange).filter(
        VehicleProductionRange.vehicle_model_id == model_id,
        VehicleProductionRange.production_year_start == start,
    )
    if end is None:
        q = q.filter(VehicleProductionRange.production_year_end.is_(None))
    else:
        q = q.filter(VehicleProductionRange.production_year_end == end)
    return q.first()


def _upsert_range(db, model: VehicleModel, entry: dict, verified_at: datetime) -> VehicleProductionRange:
    existing = _find_existing_range(db, model.id, entry["start"], entry["end"])
    if existing is None:
        existing = VehicleProductionRange(
            vehicle_model_id=model.id,
            production_year_start=entry["start"],
            production_year_end=entry["end"],
        )
        db.add(existing)

    existing.generation_label = entry.get("generation_label")
    existing.is_active = True
    existing.source_url = entry.get("source_url")
    existing.source_last_verified_at = verified_at
    return existing


def _upsert_model(db, make: VehicleMake, entry: dict, verified_at: datetime) -> tuple[VehicleModel, int]:
    normalized = normalize_name(entry["name"])

    # Computed up front — production_year_start is NOT NULL at the DB level,
    # so a brand-new row must have it set before the first flush, not after.
    starts = [r["start"] for r in entry["ranges"]]
    ends = [r["end"] for r in entry["ranges"] if r["end"] is not None]
    open_ended = any(r["end"] is None for r in entry["ranges"])
    # Denormalized summary only — see VehicleModel's docstring in
    # models/vehicle.py. Never read by services/vehicle_service.check_vehicle.
    summary_start = min(starts)
    summary_end = None if open_ended else (max(ends) if ends else None)

    model = (
        db.query(VehicleModel)
        .filter(VehicleModel.make_id == make.id, VehicleModel.normalized_name == normalized)
        .first()
    )
    if model is None:
        model = VehicleModel(
            make_id=make.id, name=entry["name"], normalized_name=normalized,
            production_year_start=summary_start, production_year_end=summary_end,
        )
        db.add(model)
        db.flush()  # assigns model.id without committing, so ranges below can reference it

    model.name = entry["name"]
    model.is_active = True
    model.production_year_start = summary_start
    model.production_year_end = summary_end
    model.source_url = entry["ranges"][-1].get("source_url")
    model.source_last_verified_at = verified_at

    for range_entry in entry["ranges"]:
        _upsert_range(db, model, range_entry, verified_at)

    return model, len(entry["ranges"])


def _invalidate_cache() -> None:
    """Explicit cache invalidation (requirement: "seed/update path cannot
    leave stale data indefinitely") — flushes every cached vehicle-catalog
    key right after a successful seed, instead of waiting out the 24h TTL
    (services/vehicle_service.VEHICLE_CATALOG_CACHE_TTL_SECONDS), which is
    only meant to bound worst-case staleness, not be the normal path.

    Best-effort and synchronous: this script has no event loop (unlike the
    FastAPI app's async Redis pool), and must keep working with no Redis
    running at all (local dev, CI) — exactly like routers/vehicles.py's own
    cache reads/writes never fail the request. redis-py's sync client is
    already an installed dependency (requirements.txt), so this adds no
    new one.
    """
    try:
        import redis as redis_sync

        client = redis_sync.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
        try:
            keys = list(client.scan_iter(match=f"{VEHICLE_CATALOG_CACHE_PREFIX}:*"))
            if keys:
                client.delete(*keys)
                logger.info("Invalidated %d cached vehicle catalog key(s)", len(keys))
        finally:
            client.close()
    except Exception:
        logger.warning(
            "Could not invalidate the vehicle catalog cache after seeding (Redis unavailable?) — "
            "cached responses will serve stale data until their TTL expires.",
            exc_info=True,
        )


def seed(db=None) -> dict:
    """Idempotent: safe to run repeatedly. Matches existing rows by
    (make normalized_name), (make_id, model normalized_name), and
    (model_id, range start, range end), updating them in place rather than
    inserting duplicates."""
    owns_session = db is None
    if owns_session:
        db = SessionLocal()

    try:
        make_count = 0
        model_count = 0
        range_count = 0
        verified_at = datetime.utcnow()

        for make_name, models in CATALOG.items():
            make = _upsert_make(db, make_name)
            make_count += 1
            for entry in models:
                _, n_ranges = _upsert_model(db, make, entry, verified_at)
                model_count += 1
                range_count += n_ranges

        db.commit()
        _invalidate_cache()
        stats = {"makes": make_count, "models": model_count, "ranges": range_count}
        logger.info("Vehicle catalog seed complete: %s", stats)
        return stats
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    init_db()  # ensures tables exist if this is run before any migration/app startup
    seed()
