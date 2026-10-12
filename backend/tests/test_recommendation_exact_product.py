# tests/test_recommendation_exact_product.py
#
# `exact_product` is what turns a shop link from a generic category search
# into a search for the actual part — these tests cover the three places a
# silent bug would otherwise hide: the schema (does it default safely when
# the AI doesn't name one), the prompt (does the AI actually get told the
# rule), and the DB round-trip (worker write -> build_service read), since
# both of those hand-map fields one by one rather than doing a generic
# dict/kwargs passthrough.

import pytest
from pydantic import ValidationError

from conftest import make_user
from models.build import Build
from models.recommendation import ModRecommendation
from services.ai_service import _build_recommendations_prompt
from services.build_service import get_build_plan
from workers.recommendation_worker import _persist_recommendations


def _mod(**overrides):
    base = dict(
        name="Cold Air Intake", category="performance", description="desc",
        price_min=150, price_max=300, difficulty="easy", stage=1, priority=1,
    )
    base.update(overrides)
    return ModRecommendation(**base)


def test_exact_product_defaults_to_empty_string_when_omitted():
    mod = _mod()
    assert mod.exact_product == ""


def test_exact_product_is_preserved_when_given():
    mod = _mod(exact_product="K&N 57-3516 69-Series Typhoon Cold Air Intake")
    assert mod.exact_product == "K&N 57-3516 69-Series Typhoon Cold Air Intake"


def test_exact_product_enforces_max_length():
    with pytest.raises(ValidationError):
        _mod(exact_product="x" * 151)


def test_prompt_tells_the_model_when_to_leave_it_blank():
    build = type("FakeBuild", (), {
        "year": 2018, "make": "Honda", "model": "Civic Si", "budget": 2500.0,
        "goal": "Fun Daily Driver", "experience": "intermediate",
        "categories": ["performance"], "is_daily": True, "notes": "",
    })()
    prompt = _build_recommendations_prompt(build)
    assert "exact_product" in prompt
    assert "empty string" in prompt


def test_exact_product_round_trips_through_worker_and_build_service(db):
    user = make_user(db, email="rec-exact-product@example.com")
    build = Build(
        user_id=user.id, title="Test Build", year=2018, make="Honda", model="Civic Si",
        budget=2500, goal="Fun Daily Driver", experience="intermediate",
        categories=["performance"], is_daily=1, status="ready",
    )
    db.add(build)
    db.commit()
    db.refresh(build)

    mods = [
        _mod(name="Cold Air Intake", exact_product="K&N 57-3516 69-Series Typhoon Cold Air Intake"),
        _mod(name="Rear Motor Mount", priority=2),  # left blank — the AI wasn't confident
    ]
    _persist_recommendations(db, build, mods)
    db.commit()

    plan = get_build_plan(db, build.id, user.id)
    by_name = {m.name: m.exact_product for m in plan.mods}
    assert by_name["Cold Air Intake"] == "K&N 57-3516 69-Series Typhoon Cold Air Intake"
    assert by_name["Rear Motor Mount"] == ""


# ── _sanitize_exact_products ─────────────────────────────────────────────────
# The model doesn't reliably keep exact_product short and clean (observed
# live — it sometimes appends fitment caveats despite being told not to).
# These cover the cleanup that runs before validation so one chatty field
# can't fail the whole recommendation set.

from services.ai_service import _sanitize_exact_products


def test_sanitize_leaves_short_values_untouched():
    raw = {"recommendations": [{"name": "x", "exact_product": "K&N 57-3516"}]}
    assert _sanitize_exact_products(raw)["recommendations"][0]["exact_product"] == "K&N 57-3516"


def test_sanitize_cuts_at_the_first_parenthetical():
    # Real example observed live — the model appended enough fitment
    # commentary to push a clean, legitimate product name over the limit.
    raw = {"recommendations": [{
        "name": "x",
        "exact_product": (
            "K&N 69-1013TS Typhoon Performance Intake Kit – 2017-2021 Honda Civic 1.5T "
            "(verify Si fitment on K&N site before ordering, as some kits span trims "
            "differently; the part listed fits the K20C4 turbocharged platform)"
        ),
    }]}
    assert len(raw["recommendations"][0]["exact_product"]) > 150
    cleaned = _sanitize_exact_products(raw)["recommendations"][0]["exact_product"]
    assert cleaned == "K&N 69-1013TS Typhoon Performance Intake Kit – 2017-2021 Honda Civic 1.5T"
    assert len(cleaned) <= 150


def test_sanitize_hard_truncates_when_no_parenthetical_present():
    raw = {"recommendations": [{"name": "x", "exact_product": "x" * 200}]}
    cleaned = _sanitize_exact_products(raw)["recommendations"][0]["exact_product"]
    assert len(cleaned) == 150


def test_sanitize_ignores_missing_or_non_string_values():
    raw = {"recommendations": [{"name": "x"}, {"name": "y", "exact_product": None}]}
    # Should not raise.
    _sanitize_exact_products(raw)


def test_sanitize_skips_malformed_non_dict_items():
    # Observed live: an occasionally-malformed response puts a bare string
    # in the recommendations list instead of an object. Pydantic should be
    # the one to reject that with a clear error — the sanitizer must not
    # itself crash on it first.
    raw = {"recommendations": [{"name": "x", "exact_product": "ok"}, "not a dict"]}
    cleaned = _sanitize_exact_products(raw)
    assert cleaned["recommendations"][0]["exact_product"] == "ok"
    assert cleaned["recommendations"][1] == "not a dict"
