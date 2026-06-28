# evals/runner.py
# Orchestrates running golden cases against the real system-under-test
# (services.ai_service._claude_build_recommendations), scoring each result,
# and rolling everything up into a SuiteReport.

import time

from evals.cassettes import FakeAnthropicClient, load_cassette
from evals.checks import (
    check_budget_adherence,
    check_category_coverage,
    check_forbidden_keywords,
    check_latency,
    check_no_duplicates,
)
from evals.judge import check_llm_judge_plausibility
from evals.schemas import CheckResult, EvalCase, EvalResult, SuiteReport
from services.ai_service import _claude_build_recommendations

# Approximate published per-million-token pricing, USD. Update if pricing
# changes — this is for cost *visibility* during eval sweeps, not billing.
MODEL_PRICING = {
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
}


def estimate_cost(model: str, input_tokens: int | None, output_tokens: int | None) -> float | None:
    pricing = MODEL_PRICING.get(model)
    if not pricing or input_tokens is None or output_tokens is None:
        return None
    return (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"]


def run_case(case: EvalCase, mode: str = "live", run_judge: bool = False) -> EvalResult:
    usage: dict = {}
    judge_usage: dict = {}

    client = None
    if mode == "replay":
        client = FakeAnthropicClient(load_cassette(case.id))

    start = time.monotonic()
    recs = _claude_build_recommendations(
        case.build,
        client=client,
        on_usage=lambda i, o: usage.update(input_tokens=i, output_tokens=o),
    )
    wall_latency_ms = (time.monotonic() - start) * 1000

    if mode == "replay":
        # The replay call itself is near-instant (no network) — that number
        # would understate real latency, so report what was actually
        # recorded at capture time instead, clearly distinguishable in the
        # report by mode="replay".
        latency_ms = load_cassette(case.id)["latency_ms"]
    else:
        latency_ms = wall_latency_ms

    checks: list[CheckResult] = []

    if recs is None:
        checks.append(CheckResult(
            name="ai_succeeded", severity="blocking", passed=False,
            message="generate path returned None — call failed or silently fell back to mock",
        ))
    else:
        checks.append(CheckResult(name="ai_succeeded", severity="blocking", passed=True, message="AI call succeeded"))
        checks.append(check_budget_adherence(case, recs))
        checks.append(check_no_duplicates(case, recs))
        checks.append(check_category_coverage(case, recs))
        checks.append(check_forbidden_keywords(case, recs))
        checks.append(check_latency(case, latency_ms))

        if run_judge:
            judge_result, judge_usage = check_llm_judge_plausibility(case, recs, client=None)
            checks.append(judge_result)

    passed = all(c.passed for c in checks if c.severity == "blocking")

    total_input = (usage.get("input_tokens") or 0) + (judge_usage.get("input_tokens") or 0)
    total_output = (usage.get("output_tokens") or 0) + (judge_usage.get("output_tokens") or 0)

    return EvalResult(
        case_id=case.id,
        mode=mode,
        model="claude-sonnet-4-6",
        ai_succeeded=recs is not None,
        recommendations=recs or [],
        checks=checks,
        latency_ms=latency_ms,
        input_tokens=total_input or None,
        output_tokens=total_output or None,
        estimated_cost_usd=estimate_cost("claude-sonnet-4-6", usage.get("input_tokens"), usage.get("output_tokens")),
        passed=passed,
    )


def run_suite(cases: list[EvalCase], mode: str = "live", run_judge: bool = False) -> SuiteReport:
    results = [run_case(case, mode=mode, run_judge=run_judge) for case in cases]

    total_cost = sum((r.estimated_cost_usd or 0) for r in results) or None
    total_latency = sum(r.latency_ms for r in results)
    passed_count = sum(1 for r in results if r.passed)

    return SuiteReport(
        mode=mode,
        total_cases=len(results),
        passed_cases=passed_count,
        failed_cases=len(results) - passed_count,
        total_cost_usd=total_cost,
        total_latency_ms=total_latency,
        results=results,
    )
