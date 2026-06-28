# evals/schemas.py
# Data contracts for the eval harness itself. These are deliberately separate
# from models/recommendation.py — that file defines what the AI is allowed to
# produce; this file defines what we expect of a *golden test case* and what
# a *check* reports. Different concerns, different lifecycles.

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from models.build import BuildCreate


class EvalCase(BaseModel):
    """One golden test case: a build request plus the assertions specific to it.

    Every case should exist for a documented reason (see `reason`) — a golden
    dataset of "examples I thought of" isn't the same thing as a golden dataset
    of "scenarios that each probe a specific failure mode."
    """
    model_config = ConfigDict(extra="forbid")

    id:          str = Field(..., pattern=r"^[a-z0-9_]+$")
    description: str
    reason:      str  # what failure mode this case specifically probes
    tags:        list[str] = Field(default=[])

    build: BuildCreate

    # Hallucination canary: tokens that must never appear in any recommendation's
    # name/description/brand_tips for this case. Ground truth, not a heuristic —
    # e.g. an EV cannot physically have a turbocharger, so this is a deterministic
    # check, unlike the probabilistic LLM-judge plausibility check.
    forbidden_keywords: list[str] = Field(default=[])

    # Soft minimum fraction of build.categories that must appear among the
    # returned recommendations' categories. Only enforced if build.categories
    # is non-empty.
    min_category_coverage: float = Field(default=0.5, ge=0, le=1)


class CheckResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name:     str
    severity: Literal["blocking", "warning", "info"]
    passed:   bool
    message:  str
    details:  dict = Field(default={})


class EvalResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id:    str
    mode:       Literal["live", "replay"]
    model:      str

    ai_succeeded:   bool   # False if generate_build_recommendations fell back to None
    recommendations: list[dict] = Field(default=[])
    checks:         list[CheckResult] = Field(default=[])

    latency_ms:          float
    input_tokens:        Optional[int] = None
    output_tokens:       Optional[int] = None
    estimated_cost_usd:  Optional[float] = None

    passed: bool   # all blocking checks passed (and ai_succeeded)

    @property
    def blocking_failures(self) -> list[CheckResult]:
        return [c for c in self.checks if c.severity == "blocking" and not c.passed]

    @property
    def warnings(self) -> list[CheckResult]:
        return [c for c in self.checks if c.severity == "warning" and not c.passed]


class SuiteReport(BaseModel):
    """The full output of one eval run — what gets written to reports/*.json
    and what CI reads to decide pass/fail."""
    model_config = ConfigDict(extra="forbid")

    mode:           Literal["live", "replay"]
    total_cases:    int
    passed_cases:   int
    failed_cases:   int
    total_cost_usd: Optional[float] = None
    total_latency_ms: float
    results:        list[EvalResult]

    @property
    def pass_rate(self) -> float:
        return self.passed_cases / self.total_cases if self.total_cases else 0.0
