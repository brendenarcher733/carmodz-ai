# evals/golden_dataset.py
# The golden dataset. Each case probes a specific, named failure mode — not
# just "an example build." If you can't articulate what a case is testing,
# it doesn't belong here; it's noise that makes failures harder to interpret.

from models.build import BuildCreate
from evals.schemas import EvalCase

GOLDEN_CASES: list[EvalCase] = [

    EvalCase(
        id="baseline_mid_budget_daily",
        description="2020 Subaru WRX STI, $6k, street performance, intermediate, daily",
        reason="Happy-path baseline. Every other case is a deviation from this one.",
        tags=["baseline"],
        build=BuildCreate(
            title="baseline", year=2020, make="Subaru", model="WRX STI",
            budget=6000, goal="street performance", experience="intermediate",
            categories=["performance", "handling"], is_daily=True, notes="",
        ),
    ),

    EvalCase(
        id="ev_no_ice_parts",
        description="2023 Tesla Model 3 Performance, $5k, max power, intermediate, daily",
        reason=(
            "Hallucination canary with deterministic ground truth: an EV physically "
            "cannot have a turbocharger, cold air intake, ECU remap (in the ICE sense), "
            "headers, or a downpipe. If any of these appear, that's not a matter of "
            "taste — it's a factually wrong recommendation."
        ),
        tags=["hallucination", "ev"],
        build=BuildCreate(
            title="ev case", year=2023, make="Tesla", model="Model 3 Performance",
            budget=5000, goal="max power", experience="intermediate",
            categories=["performance"], is_daily=True, notes="",
        ),
        forbidden_keywords=[
            "turbo", "turbocharger", "supercharger kit", "cold air intake",
            "intercooler", "downpipe", "header", "cat-back", "spark plug",
            "ecu tune", "ecu remap", "engine oil",
        ],
    ),

    EvalCase(
        id="beginner_micro_budget",
        description="2010 Toyota Corolla, $300, budget performance build, beginner, daily",
        reason=(
            "Budget floor stress test. $300 is below the app's own '$500 limits "
            "options' warning threshold — checks the model degrades gracefully "
            "(fewer/cheaper mods) instead of recommending things it can't afford "
            "or padding the list with irrelevant cheap filler."
        ),
        tags=["budget_edge", "beginner"],
        build=BuildCreate(
            title="micro budget", year=2010, make="Toyota", model="Corolla",
            budget=300, goal="budget performance build", experience="beginner",
            categories=["performance", "reliability"], is_daily=True, notes="",
        ),
    ),

    EvalCase(
        id="beginner_avoids_advanced_mods",
        description="2015 Honda Civic, $1.5k, budget build, beginner, daily",
        reason=(
            "Experience-gating check: the prompt instructs 'beginner builds: avoid "
            "stage 3 and hard difficulty.' This case verifies that instruction is "
            "actually followed, not just present in the prompt."
        ),
        tags=["experience_gating", "beginner"],
        build=BuildCreate(
            title="beginner gate", year=2015, make="Honda", model="Civic Si",
            budget=1500, goal="budget performance build", experience="beginner",
            categories=["performance", "handling"], is_daily=True, notes="",
        ),
    ),

    EvalCase(
        id="high_budget_advanced_track",
        description="2023 Chevrolet Corvette Z06, $25k, track focused, advanced, project car",
        reason=(
            "High-budget ceiling test — verifies the model uses the available "
            "budget meaningfully (doesn't under-recommend out of caution) and that "
            "stage 3 / hard-difficulty mods are allowed to appear for an advanced "
            "track-focused build, unlike the beginner case above."
        ),
        tags=["budget_edge", "advanced"],
        build=BuildCreate(
            title="track build", year=2023, make="Chevrolet", model="Corvette Z06",
            budget=25000, goal="track focused setup", experience="advanced",
            categories=["performance", "handling"], is_daily=False, notes="",
        ),
    ),

    EvalCase(
        id="exotic_platform_realism",
        description="2022 Ferrari 296 GTB, $40k, cosmetic upgrades, advanced, project car",
        reason=(
            "Exotic-platform plausibility test. Mainstream brands like Borla or "
            "K&N don't make parts for a 296 GTB — this case is where the LLM-judge "
            "plausibility check earns its keep, since there's no fixed keyword list "
            "for 'wrong brand for an exotic.'"
        ),
        tags=["hallucination", "exotic"],
        build=BuildCreate(
            title="exotic case", year=2022, make="Ferrari", model="296 GTB",
            budget=40000, goal="cosmetic upgrades", experience="advanced",
            categories=["cosmetic"], is_daily=False, notes="",
        ),
    ),

    EvalCase(
        id="reliability_first_high_mileage",
        description="2012 Toyota Camry, $2k, reliability first, beginner, daily",
        reason=(
            "Goal-adherence check for a non-performance goal. A model that defaults "
            "to recommending intakes and exhausts regardless of stated goal would "
            "fail this case even if every individual recommendation is well-formed."
        ),
        tags=["category_coverage"],
        build=BuildCreate(
            title="reliability case", year=2012, make="Toyota", model="Camry",
            budget=2000, goal="reliability first", experience="beginner",
            categories=["reliability"], is_daily=True, notes="180,000 miles, never modified",
        ),
        min_category_coverage=1.0,
    ),

    EvalCase(
        id="sound_focused_single_category",
        description="2019 Mazda MX-5 Miata, $3k, sound upgrades, intermediate, daily",
        reason="Single-category request — coverage should be close to 100%, not diluted across unrelated categories.",
        tags=["category_coverage"],
        build=BuildCreate(
            title="sound case", year=2019, make="Mazda", model="MX-5 Miata",
            budget=3000, goal="sound upgrades", experience="intermediate",
            categories=["sound"], is_daily=True, notes="",
        ),
        min_category_coverage=0.8,
    ),

    EvalCase(
        id="wide_multi_category_request",
        description="2021 Nissan GT-R, $15k, max power, advanced, project car, 4 categories requested",
        reason=(
            "Category coverage breadth test — with 4 requested categories and a "
            "generous budget, a model that just piles on engine mods and ignores "
            "the other 3 categories should show up here as low coverage."
        ),
        tags=["category_coverage"],
        build=BuildCreate(
            title="wide case", year=2021, make="Nissan", model="GT-R",
            budget=15000, goal="max power", experience="advanced",
            categories=["performance", "handling", "sound", "cosmetic"], is_daily=False, notes="",
        ),
        min_category_coverage=0.5,
    ),

    EvalCase(
        id="duplicate_pressure_narrow_scope",
        description="2017 Mazda MX-5 Miata, $900, sound upgrades only, beginner, daily",
        reason=(
            "Tight budget + single narrow category is the condition most likely to "
            "push a model toward padding the list with near-duplicate entries "
            "(e.g. 'Resonator Delete' and 'Resonator Removal') to hit a target count."
        ),
        tags=["duplicates", "budget_edge"],
        build=BuildCreate(
            title="duplicate pressure", year=2017, make="Mazda", model="MX-5 Miata",
            budget=900, goal="sound upgrades", experience="beginner",
            categories=["sound"], is_daily=True, notes="",
        ),
    ),
]


def get_case(case_id: str) -> EvalCase:
    for case in GOLDEN_CASES:
        if case.id == case_id:
            return case
    raise KeyError(f"No golden case with id={case_id!r}")
