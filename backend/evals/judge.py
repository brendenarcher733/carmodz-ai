# evals/judge.py
# LLM-as-judge plausibility check — the general-purpose hallucination
# detector for cases that don't have (or can't have) a hand-maintained
# forbidden-keyword list. checks.check_forbidden_keywords only catches what
# someone thought to write down in advance (e.g. "EVs can't have turbos");
# it says nothing about whether "Brembo GT4 Big Brake Kit for a Ferrari 296
# GTB" is a real product. That's an open-ended plausibility judgment, which
# is exactly the kind of question an LLM judge is suited for and a fixed
# keyword list is not.
#
# Deliberately uses a cheaper/faster model than generation (Haiku, not
# Sonnet): judging "is this plausible" is a simpler task than generating a
# tailored build plan, and judge calls run once per recommendation set per
# eval sweep — using the expensive model here would multiply eval cost for
# no accuracy benefit proportional to the spend. This is a cost/quality
# tradeoff made on purpose, not an oversight.
#
# Reuses the exact tool-forced structured-output pattern from ai_service.py
# rather than inventing a second way to get structured output out of Claude —
# one pattern, two use sites.

import copy
import logging
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from core.config import settings
from evals.schemas import CheckResult, EvalCase

logger = logging.getLogger(__name__)

JUDGE_MODEL = "claude-haiku-4-5-20251001"


class PlausibilityVerdict(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plausible: bool
    confidence: Literal["low", "medium", "high"]
    concerns: list[str] = Field(default=[], max_length=10)


_STRICT_UNSUPPORTED_KEYS = {
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minLength", "maxLength", "minItems", "maxItems", "pattern", "format", "default",
}


def _strict_safe_schema(schema: dict) -> dict:
    stripped = copy.deepcopy(schema)

    def _strip(node):
        if isinstance(node, dict):
            for key in _STRICT_UNSUPPORTED_KEYS:
                node.pop(key, None)
            for v in node.values():
                _strip(v)
        elif isinstance(node, list):
            for v in node:
                _strip(v)

    _strip(stripped)
    return stripped


JUDGE_TOOL = {
    "name": "submit_plausibility_verdict",
    "description": "Submit a plausibility verdict for a set of vehicle modification recommendations.",
    "input_schema": _strict_safe_schema(PlausibilityVerdict.model_json_schema()),
    "strict": True,
}


def _judge_prompt(case: EvalCase, recs: list[dict]) -> str:
    vehicle = f"{case.build.year} {case.build.make} {case.build.model}"
    lines = [f"- {r['name']} ({r['category']}): {r['description'][:160]}" for r in recs]
    parts_list = "\n".join(lines)

    return f"""You are a skeptical automotive parts expert reviewing AI-generated
modification recommendations for factual plausibility — not quality or taste.

Vehicle: {vehicle}

Recommended parts:
{parts_list}

For each part, ask: could this realistically exist for this exact vehicle?
Flag concerns for:
- Parts that are physically impossible for this vehicle (e.g. a turbocharger
  kit for a pure EV, a part for a transmission type this vehicle doesn't have)
- Brand names that don't plausibly serve this platform (e.g. a budget JDM
  tuning brand claiming to make parts for an ultra-low-volume hypercar)
- Specs that are internally inconsistent or absurd for the stated vehicle

Do NOT flag: subjective recommendations, pricing opinions, or anything that's
merely unusual but not impossible. Call submit_plausibility_verdict with your verdict."""


def judge_plausibility(
    case: EvalCase,
    recs: list[dict],
    client=None,
) -> tuple[Optional[PlausibilityVerdict], dict]:
    """Returns (verdict, usage_dict). verdict is None if the judge call itself failed —
    that failure is reported distinctly from "the judge found a problem"."""
    usage: dict = {}
    try:
        if client is None:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=1000,
            tools=[JUDGE_TOOL],
            tool_choice={"type": "tool", "name": "submit_plausibility_verdict"},
            messages=[{"role": "user", "content": _judge_prompt(case, recs)}],
        )

        if getattr(response, "usage", None) is not None:
            usage = {"input_tokens": response.usage.input_tokens, "output_tokens": response.usage.output_tokens}

        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if tool_use is None:
            logger.warning("Judge returned no tool_use block for case %s", case.id)
            return None, usage

        verdict = PlausibilityVerdict.model_validate(tool_use.input)
        return verdict, usage

    except ValidationError as e:
        logger.warning("Judge verdict failed schema validation for case %s: %s", case.id, e)
        return None, usage
    except Exception:
        logger.exception("Judge call failed for case %s", case.id)
        return None, usage


def check_llm_judge_plausibility(case: EvalCase, recs: list[dict], client=None) -> tuple[CheckResult, dict]:
    verdict, usage = judge_plausibility(case, recs, client=client)

    if verdict is None:
        return CheckResult(
            name="llm_judge_plausibility", severity="warning", passed=True,
            message="Judge call failed/unavailable — not counted against the case",
        ), usage

    # Warning, not blocking: a probabilistic judge can be wrong, and a false
    # positive here shouldn't fail a build the way a forbidden-keyword hit does.
    return CheckResult(
        name="llm_judge_plausibility",
        severity="warning",
        passed=verdict.plausible,
        message=(
            f"Judge: plausible={verdict.plausible}, confidence={verdict.confidence}"
            + (f", concerns={verdict.concerns}" if verdict.concerns else "")
        ),
        details=verdict.model_dump(),
    ), usage
