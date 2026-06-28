# evals/checks.py
# Deterministic, free, zero-API-call checks. Each takes the case and the
# recommendations the system under test produced, and returns a CheckResult.
#
# Severity convention used throughout this module:
#   blocking — a violated invariant, not a matter of taste. Fails the case.
#   warning  — informative signal worth tracking, but not by itself a defect
#              (e.g. category coverage can legitimately be low if the model
#              made a judgment call to concentrate budget).
# The LLM-as-judge plausibility check (evals/judge.py) is deliberately kept at
# "warning" even though it's checking something important (hallucinated
# parts) — a probabilistic judge can be wrong, and a false positive there
# shouldn't fail a build. The forbidden_keywords check below IS blocking,
# because it's ground truth, not a judgment call.

from evals.schemas import CheckResult, EvalCase


def check_budget_adherence(case: EvalCase, recs: list[dict]) -> CheckResult:
    budget = case.build.budget
    total_min = sum(r["price_min"] for r in recs)
    ratio = total_min / budget if budget else float("inf")
    passed = total_min <= budget * 1.15

    return CheckResult(
        name="budget_adherence",
        severity="blocking",
        passed=passed,
        message=(
            f"Sum of price_min (${total_min:,.0f}) is "
            f"{'within' if passed else 'OVER'} 115% of budget (${budget:,.0f})"
        ),
        details={"total_min": total_min, "budget": budget, "budget_utilization": round(ratio, 3)},
    )


def check_no_duplicates(case: EvalCase, recs: list[dict]) -> CheckResult:
    names = [r["name"].strip().lower() for r in recs]
    duplicates = sorted({n for n in names if names.count(n) > 1})
    return CheckResult(
        name="no_duplicates",
        severity="blocking",
        passed=len(duplicates) == 0,
        message="No duplicate mod names" if not duplicates else f"Duplicate names: {duplicates}",
        details={"duplicate_names": duplicates},
    )


def check_category_coverage(case: EvalCase, recs: list[dict]) -> CheckResult:
    requested = set(case.build.categories)
    if not requested:
        return CheckResult(
            name="category_coverage", severity="warning", passed=True,
            message="No categories requested — coverage not applicable",
            details={"coverage": 1.0},
        )

    present = {r["category"] for r in recs}
    overlap = requested & present
    coverage = len(overlap) / len(requested)
    passed = coverage >= case.min_category_coverage

    return CheckResult(
        name="category_coverage",
        severity="warning",
        passed=passed,
        message=(
            f"Coverage {coverage:.0%} of requested categories {sorted(requested)} "
            f"(threshold {case.min_category_coverage:.0%}); present: {sorted(present)}"
        ),
        details={"coverage": round(coverage, 3), "requested": sorted(requested), "present": sorted(present)},
    )


def check_forbidden_keywords(case: EvalCase, recs: list[dict]) -> CheckResult:
    """Deterministic hallucination check. Only meaningful for cases that
    define forbidden_keywords (e.g. ICE-only parts for an EV) — for every
    other case this trivially passes, which is correct: absence of a ground-
    truth violation list doesn't mean "no hallucinations," it means "we don't
    have a cheap deterministic way to check this one," which is exactly what
    the LLM-judge check in judge.py exists for.
    """
    if not case.forbidden_keywords:
        return CheckResult(
            name="forbidden_keywords", severity="blocking", passed=True,
            message="No forbidden-keyword list defined for this case — not applicable",
        )

    haystack = " ".join(
        r["name"] + " " + r["description"] + " " + " ".join(r.get("brand_tips", []))
        for r in recs
    ).lower()

    hits = sorted({kw for kw in case.forbidden_keywords if kw.lower() in haystack})
    return CheckResult(
        name="forbidden_keywords",
        severity="blocking",
        passed=len(hits) == 0,
        message="No forbidden keywords found" if not hits else f"Found forbidden keywords: {hits}",
        details={"forbidden_keywords": case.forbidden_keywords, "hits": hits},
    )


def check_latency(case: EvalCase, latency_ms: float, threshold_ms: float = 8000) -> CheckResult:
    return CheckResult(
        name="latency",
        severity="warning",
        passed=latency_ms <= threshold_ms,
        message=f"{latency_ms:.0f}ms (threshold {threshold_ms:.0f}ms)",
        details={"latency_ms": round(latency_ms, 1), "threshold_ms": threshold_ms},
    )


DETERMINISTIC_CHECKS = [
    check_budget_adherence,
    check_no_duplicates,
    check_category_coverage,
    check_forbidden_keywords,
]
