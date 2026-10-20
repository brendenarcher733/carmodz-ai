# tests/test_recommendation_schema.py
#
# Covers the short, structured ModRecommendation contract (why/impact/
# compatibility_note/tradeoff/suggested_search_terms) and the per-item
# repair logic in services/ai_service.py that lets one malformed or
# over-budget recommendation get dropped/repaired instead of discarding an
# otherwise-good response — the three places a silent bug would hide: the
# schema (does it default safely), the prompt (does the AI get told the
# rules), and the DB round-trip (worker write -> build_service read), since
# both of those hand-map fields one by one rather than doing a generic
# dict/kwargs passthrough.

import pytest
from pydantic import ValidationError

from conftest import make_user
from models.build import Build
from models.recommendation import ModRecommendation
from services.ai_service import (
    _build_recommendations_prompt,
    _dedupe_recommendations,
    _parse_recommendations,
    _sanitize_recommendation_dict,
    _trim_to_budget,
)
from services.build_service import get_build_plan
from workers.recommendation_worker import _persist_recommendations


def _mod(**overrides):
    base = dict(
        name="Cold Air Intake", category="performance",
        price_min=150, price_max=300, difficulty="easy", stage=1, priority=1,
        why="Improves throttle response and airflow.",
    )
    base.update(overrides)
    return ModRecommendation(**base)


def _raw(**overrides):
    base = dict(
        name="Cold Air Intake", category="performance",
        price_min=150, price_max=300, difficulty="easy", stage=1, priority=1,
        why="Improves throttle response and airflow.",
    )
    base.update(overrides)
    return base


# ── schema defaults ──────────────────────────────────────────────────────────

def test_optional_short_fields_default_to_empty():
    mod = _mod()
    assert mod.impact == ""
    assert mod.compatibility_note == ""
    assert mod.tradeoff == ""
    assert mod.suggested_search_terms == []


def test_short_fields_are_preserved_when_given():
    mod = _mod(impact="More power.", compatibility_note="Turbo only.",
               tradeoff="Can be loud.", suggested_search_terms=["K&N cold air intake"])
    assert mod.impact == "More power."
    assert mod.compatibility_note == "Turbo only."
    assert mod.tradeoff == "Can be loud."
    assert mod.suggested_search_terms == ["K&N cold air intake"]


def test_why_is_required():
    with pytest.raises(ValidationError):
        ModRecommendation(name="x", category="performance", price_min=1, price_max=2,
                           difficulty="easy", stage=1, priority=1, why="")


def test_prompt_asks_for_5_to_7_concise_mods():
    build = type("FakeBuild", (), {
        "year": 2018, "make": "Honda", "model": "Civic Si", "budget": 2500.0,
        "goal": "Fun Daily Driver", "experience": "intermediate",
        "categories": ["performance"], "is_daily": True, "notes": "",
    })()
    prompt = _build_recommendations_prompt(build)
    assert "5-7" in prompt
    assert "suggested_search_terms" in prompt


def test_round_trips_through_worker_and_build_service(db):
    user = make_user(db, email="rec-schema@example.com")
    build = Build(
        user_id=user.id, title="Test Build", year=2018, make="Honda", model="Civic Si",
        budget=2500, goal="Fun Daily Driver", experience="intermediate",
        categories=["performance"], is_daily=1, status="ready",
    )
    db.add(build)
    db.commit()
    db.refresh(build)

    mods = [
        _mod(name="Cold Air Intake", suggested_search_terms=["K&N 57-3516"]),
        _mod(name="Rear Motor Mount", priority=2),  # no search terms — the AI wasn't confident
    ]
    _persist_recommendations(db, build, mods)
    db.commit()

    plan = get_build_plan(db, build.id, user.id)
    by_name = {m.name: m for m in plan.mods}
    assert by_name["Cold Air Intake"].suggested_search_terms == ["K&N 57-3516"]
    assert by_name["Rear Motor Mount"].suggested_search_terms == []


# ── _sanitize_recommendation_dict ────────────────────────────────────────────
# The model doesn't reliably keep short fields short (observed live on the
# old exact_product field — same failure mode applies to any free-text
# field). This covers the cleanup that runs before validation.

def test_sanitize_leaves_short_values_untouched():
    cleaned = _sanitize_recommendation_dict(_raw(impact="More power."))
    assert cleaned["impact"] == "More power."


def test_sanitize_cuts_at_the_first_parenthetical():
    long_impact = (
        "Significant mid-range torque gains across the board "
        "(verify fitment on your specific trim before ordering, as some kits span "
        "trims differently; the part listed fits the turbocharged platform only)"
    )
    assert len(long_impact) > 160
    cleaned = _sanitize_recommendation_dict(_raw(impact=long_impact))["impact"]
    assert cleaned == "Significant mid-range torque gains across the board"
    assert len(cleaned) <= 160


def test_sanitize_hard_truncates_when_no_parenthetical_present():
    cleaned = _sanitize_recommendation_dict(_raw(impact="x" * 200))["impact"]
    assert len(cleaned) == 160


def test_sanitize_caps_and_filters_search_terms():
    raw = _raw(suggested_search_terms=["a", "", "b", "c", "d", None, "x" * 100])
    cleaned = _sanitize_recommendation_dict(raw)["suggested_search_terms"]
    assert cleaned == ["a", "b", "c"]


def test_sanitize_defaults_non_list_search_terms_to_empty():
    cleaned = _sanitize_recommendation_dict(_raw(suggested_search_terms="not a list"))
    assert cleaned["suggested_search_terms"] == []


# ── _parse_recommendations — per-item repair, not all-or-nothing ────────────

def test_parse_drops_malformed_item_but_keeps_the_rest():
    raw = {"recommendations": [
        _raw(name="Good Mod"),
        "not a dict",
        {"name": "Missing required fields"},
    ]}
    recs = _parse_recommendations(raw, budget=5000)
    assert [r.name for r in recs] == ["Good Mod"]


def test_parse_returns_empty_list_when_recommendations_key_is_missing_or_wrong_type():
    assert _parse_recommendations({}, budget=5000) == []
    assert _parse_recommendations({"recommendations": "nope"}, budget=5000) == []


def test_dedupe_keeps_first_occurrence_by_name_case_insensitive():
    recs = [_mod(name="Cold Air Intake"), _mod(name="cold air intake", priority=2)]
    deduped = _dedupe_recommendations(recs)
    assert len(deduped) == 1
    assert deduped[0].priority == 1


def test_trim_to_budget_drops_lowest_priority_mods_not_the_whole_set():
    recs = [
        _mod(name="A", priority=1, price_min=1000, price_max=1000),
        _mod(name="B", priority=2, price_min=1000, price_max=1000),
        _mod(name="C", priority=3, price_min=1000, price_max=1000),
    ]
    kept = _trim_to_budget(recs, budget=1500)  # 115% = 1725
    assert [r.name for r in kept] == ["A"]


def test_trim_to_budget_keeps_everything_when_within_budget():
    recs = [_mod(name="A", price_min=100, price_max=200)]
    assert _trim_to_budget(recs, budget=5000) == recs
