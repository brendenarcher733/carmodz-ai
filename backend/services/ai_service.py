"""
services/ai_service.py

Mod Advisor AI service.
  - Build recommendations: Claude (tool-forced structured output) > OpenAI > caller falls back to mock_ai.
  - Chat: Claude > OpenAI > rich keyword-based mock. Chat stays free-text — there's
    no structured contract to enforce there, unlike recommendations.

The public interfaces (generate_build_recommendations, generate_chat_response) never
change shape, so routers/services calling into this module are fully decoupled from
which provider (or the mock) actually produced the result.
"""

import copy
import logging
import random
import uuid
from typing import Optional

from pydantic import ValidationError

from core import analytics
from core.config import settings
from models.recommendation import EvaluatedModRecommendation, ModRecommendation, ModRecommendationsResponse
from services.fitment_service import evaluate_fitment
from services.vehicle_service import normalize_name

logger = logging.getLogger(__name__)


def _ai_observability_args(
    session_id: str,
    trace_id: str,
    user_id: int | None,
) -> dict:
    """Attach the existing conversation, turn, and user IDs to a generation."""
    args = {
        "posthog_trace_id": trace_id,
        "posthog_properties": {"$ai_session_id": session_id},
        "posthog_privacy_mode": False,
    }
    if user_id is not None:
        args["posthog_distinct_id"] = str(user_id)
    return args


# Neither Anthropic nor OpenAI clients below previously set an explicit
# timeout/retry count, so both ran on SDK defaults — confirmed directly
# against the installed anthropic SDK: a 600s read timeout and 2 automatic
# internal retries. That means a single call could silently take up to
# ~3x this long before our own retry logic even sees a failure.
#
# Retry count is deliberately different per workload — found by hitting a
# real production regression, not designed up front:
#
# Recommendations: max_retries=0. The worker (workers/recommendation_worker.py)
# already retries with its own backoff and an instant mock fallback. With
# max_retries=1 here, a single worker-level "attempt" could internally retry
# once more inside the SDK — up to 2x the per-call timeout for what looks
# like one attempt — which silently exceeded the worker's own
# JOB_TIMEOUT_SECONDS and let arq's blunt timeout kill the job before the
# worker's graceful Retry()-with-backoff ever ran. Retries belong in exactly
# one place for this path, and the worker is it.
#
# Chat: max_retries=1, not 0. Chat has no other retry layer at all — no
# worker, nothing upstream — it previously relied entirely on the SDK's own
# default (2) to silently absorb transient blips. Setting it to 0 (deployed
# briefly, then reverted after live verification against production caught
# it) removed chat's only safety net: a single transient Anthropic hiccup
# started surfacing immediately as a mock-fallback response instead of
# quietly succeeding on retry. 1 retry keeps a real safety margin without
# reintroducing the multi-minute-tail problem this whole pass exists to fix.
RECOMMENDATIONS_MAX_RETRIES = 0
CHAT_MAX_RETRIES = 1

# Two different timeouts, not one shared value — corrected after live testing
# against the real API caught the original single 30s constant timing out a
# large fraction of genuinely-successful build-recommendation calls. Chat
# (max_tokens=600, plain text) is fast; recommendations (max_tokens=4000,
# forced strict tool-call, 5-7 structured items) is a fundamentally
# different workload whose OWN pre-existing code comment already documented
# 25-45s as its *normal*, not worst-case, latency — a 30s ceiling sat inside
# that normal range instead of above it.
CHAT_REQUEST_TIMEOUT_SECONDS = 25
RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS = 75


# ── Build Recommendations — structured output ────────────────────────────────
#
# ModRecommendationsResponse (models/recommendation.py) is the single source of
# truth for the recommendation shape. Its generated JSON Schema is the basis
# for the tool's input_schema below, so the schema the model is constrained to
# produce and the schema we validate against can never drift apart — there's
# exactly one place that defines "what a recommendation looks like."
#
# Anthropic's strict tool mode (constrained decoding against the schema, not
# just schema-guided prompting) only supports a structural subset of JSON
# Schema — confirmed empirically against the live API, not assumed from docs.
# minimum/maximum/length/items bounds are rejected outright with a 400. So
# this module keeps two projections of the one schema:
#   - the full Pydantic schema, used for post-hoc validation (range, length,
#     and the cross-field price_max >= price_min check)
#   - a stripped "strict-safe" projection, used as the actual tool input_schema,
#     which keeps the parts strict mode *does* enforce at generation time:
#     type, enum (so difficulty/category can't be misspelled or invented),
#     required, and additionalProperties: false.
# Numeric ranges aren't enforced twice for redundancy's sake — strict mode
# structurally can't express them, so Pydantic is the only place they're
# checked. That's a deliberate division of labor, not a gap.

_STRICT_UNSUPPORTED_KEYS = {
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minLength", "maxLength", "minItems", "maxItems", "pattern", "format", "default",
}


def _strict_safe_schema(schema: dict) -> dict:
    """Strip JSON Schema keywords Anthropic's strict tool mode doesn't support."""
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


RECOMMENDATIONS_TOOL = {
    "name": "submit_mod_recommendations",
    "description": (
        "Submit a structured list of realistic aftermarket modification "
        "recommendations for the given vehicle, budget, and goal."
    ),
    "input_schema": _strict_safe_schema(ModRecommendationsResponse.model_json_schema()),
    # Anthropic's strict mode guarantees the tool input is validated against
    # the (stripped) schema before it's returned — not just schema-guided
    # generation. Pydantic validation below covers everything strict mode
    # had to give up to make that guarantee.
    "strict": True,
}


# Must match the corresponding Field(max_length=...) bounds on ModRecommendation
# (models/recommendation.py) — kept as a separate constant because sanitization
# runs on raw dicts, before Pydantic ever sees them.
_SHORT_TEXT_FIELD_LIMITS = {"why": 220, "impact": 160, "compatibility_note": 160, "tradeoff": 160}
_MAX_SEARCH_TERMS = 3
_MAX_SEARCH_TERM_LEN = 80


def _clean_short_text(value, max_len: int) -> str:
    """Enforce a field's length without just discarding it outright — the
    model sometimes runs on past the length the prompt asks for (confirmed
    live on the old exact_product field, same failure mode here). Cuts at
    the first parenthetical, where rambling commentary almost always
    starts, then hard-truncates as a last resort."""
    if not isinstance(value, str):
        return ""
    value = value.strip()
    if len(value) <= max_len:
        return value
    cut = value.split("(")[0].strip(" -–:")
    return cut if len(cut) <= max_len else cut[:max_len].rstrip()


def _sanitize_recommendation_dict(rec: dict) -> dict:
    """Clean one recommendation's fields in place so a verbose or slightly
    malformed value doesn't fail Pydantic validation and throw away an
    otherwise-good recommendation (see _parse_recommendations, which drops/
    repairs per item instead of discarding the whole response for one bad
    field)."""
    for field, limit in _SHORT_TEXT_FIELD_LIMITS.items():
        if field in rec:
            rec[field] = _clean_short_text(rec.get(field), limit)

    terms = rec.get("suggested_search_terms")
    if isinstance(terms, list):
        rec["suggested_search_terms"] = [
            t.strip()[:_MAX_SEARCH_TERM_LEN] for t in terms if isinstance(t, str) and t.strip()
        ][:_MAX_SEARCH_TERMS]
    else:
        rec["suggested_search_terms"] = []
    return rec


def _dedupe_recommendations(recs: list) -> list:
    """Drop later duplicates by name instead of failing the whole set."""
    seen: set[str] = set()
    deduped = []
    for r in recs:
        key = r.name.strip().lower()
        if key in seen:
            logger.warning("Dropping duplicate recommendation: %s", r.name)
            continue
        seen.add(key)
        deduped.append(r)
    return deduped


def _trim_to_budget(recs: list, budget: float):
    """Drop the lowest-priority (highest priority number) mods until the
    total fits within 115% of budget, instead of discarding the entire set
    over one over-budget response. 15% slack tolerates reasonable estimation
    variance — same threshold the old all-or-nothing check used."""
    limit = budget * 1.15
    kept = []
    running_total = 0.0
    for r in sorted(recs, key=lambda r: r.priority):
        if running_total + r.price_min <= limit:
            kept.append(r)
            running_total += r.price_min
        else:
            logger.warning(
                "Dropping over-budget recommendation: %s ($%.0f, running total would be $%.0f > $%.0f limit)",
                r.name, r.price_min, running_total + r.price_min, limit,
            )
    return kept


def _parse_recommendations(
    raw: dict, budget: float, make: str = "", model: str = "", vehicle_verified: bool = True
) -> list[EvaluatedModRecommendation]:
    """Turn a raw AI response into a list of valid EvaluatedModRecommendation
    objects, repairing or dropping individual bad items rather than
    discarding the whole response — see the module docstring's goal of only
    falling back to mock when no valid AI recommendations remain at all.

    Pipeline order (Phase 2 — vehicle-aware fitment validation):
      1. sanitize the raw dict (existing — repairs overlength/malformed text
         so a chatty field doesn't fail parsing, see _sanitize_recommendation_dict)
      2. parse through the existing Pydantic schema (ModRecommendation)
      3. normalize make/model and evaluate fitment (services/fitment_service)
      4. drop only recommendations explicitly determined incompatible —
         everything else (including every "unknown") is preserved
      5. dedupe, then budget-trim (existing, unchanged)
    Steps 1-2 are sanitize-then-parse, not parse-then-sanitize: sanitizing
    the raw dict is what lets slightly-malformed AI output pass Pydantic
    validation in the first place (e.g. truncating an overlong field) — a
    literal parse-first order would make sanitization unable to do its job.

    make/model/vehicle_verified default to "" / True so any existing caller
    that hasn't been updated to pass them (older tests, the eval harness)
    behaves exactly as before this phase: evaluate_fitment never matches a
    real vehicle against an empty make/model, so every recommendation stays
    "unknown" — never dropped, nothing changes about which recommendations
    survive.
    """
    items = raw.get("recommendations")
    if not isinstance(items, list):
        logger.warning("AI response had no usable 'recommendations' list: %r", type(items).__name__)
        return []

    normalized_make = normalize_name(make)
    normalized_model = normalize_name(model)

    valid: list[EvaluatedModRecommendation] = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            logger.warning("Dropping recommendation #%d — not an object (got %s)", i, type(item).__name__)
            continue
        try:
            base = ModRecommendation.model_validate(_sanitize_recommendation_dict(item))
        except ValidationError as e:
            logger.warning("Dropping malformed recommendation #%d (%r): %s", i, item.get("name", "?"), e)
            continue

        fitment = evaluate_fitment(
            name=base.name, category=base.category,
            make=normalized_make, model=normalized_model,
            vehicle_verified=vehicle_verified,
        )
        if fitment.status == "incompatible":
            logger.warning(
                "Dropping incompatible recommendation %r for %s %s: %s",
                base.name, make, model, fitment.reason,
            )
            continue

        valid.append(EvaluatedModRecommendation(
            **base.model_dump(),
            fitment_status=fitment.status,
            fitment_reason=fitment.reason,
            fitment_source=fitment.source,
        ))

    valid = _dedupe_recommendations(valid)
    valid = _trim_to_budget(valid, budget)
    return valid


def _build_recommendations_prompt(build, vehicle_verified: bool = True) -> str:
    usage_label = "Daily Driver" if getattr(build, "is_daily", True) else "Project / Track Car"
    categories  = ", ".join(build.categories) if build.categories else "performance, handling"
    notes_line  = f"\nUser notes: {build.notes}" if getattr(build, "notes", "") else ""
    # Set by callers once services/vehicle_service.check_vehicle has already
    # run (build_service.create_build for saved builds, routers/plans.py for
    # anonymous previews) — this function has no DB access and makes no
    # catalog decision of its own, it only adjusts how confidently the model
    # is allowed to talk about fitment.
    unverified_note = "" if vehicle_verified else (
        "\n\nIMPORTANT: This exact "
        f"{build.year} {build.make} {build.model} is not in our verified vehicle "
        "catalog yet (unknown to us, not known to be wrong). Do not claim guaranteed "
        "exact fitment for any part. Use general platform/engine-family knowledge, "
        "and note fitment uncertainty in compatibility_note where it's relevant."
    )

    return f"""You are a car modification expert with deep knowledge of aftermarket parts.
Recommend realistic aftermarket modifications for this specific vehicle by calling the
submit_mod_recommendations tool.

Vehicle: {build.year} {build.make} {build.model}
Budget: ${build.budget:,.0f} total
Primary Goal: {build.goal}
Experience Level: {build.experience}
Usage: {usage_label}
Categories: {categories}{notes_line}

Rules:
- Recommend 5-7 of the BEST mods for this budget and goal — quality over quantity,
  not a quota to fill. If the budget is small (roughly under $1,500), recommend
  fewer (3-5) rather than padding the list to hit a count.
- Be SPECIFIC to the {build.year} {build.make} {build.model} — name real parts that exist for this platform
- Sum of price_min across all recommendations must not exceed ${build.budget:,.0f}
- Stage 1 mods should fit within the first 50% of budget
- Beginner builds: avoid stage 3 and "hard" difficulty
- Prioritise reliability/foundation work before power mods if high mileage or beginner
- Use real brands: K&N, Borla, Cobb, KW, Brembo, Mishimoto, etc.

Keep every field SHORT — this is a concise structured list, not an essay. Do not
write paragraphs, and do not repeat the same information across fields:
- why: 1-2 sentences max — the single best reason this mod fits this car/goal/budget.
- impact: 1 short sentence — what measurably improves (power, sound, handling, feel).
- compatibility_note: 1 short sentence, or leave as an empty string if there's
  nothing notable — a real fitment/platform caveat (e.g. "turbocharged models only").
- tradeoff: 1 short sentence, or leave as an empty string if there's no real
  downside — the honest cost (price, maintenance, noise, emissions legality, etc).
- suggested_search_terms: 1-3 short shopping search phrases (brand + product type,
  e.g. "K&N cold air intake", "Borla S-Type cat-back exhaust") to help the user
  search for this part. These are search terms, NOT a guess at an exact SKU,
  part number, or model-year-specific product — never invent one.{unverified_note}"""


def generate_build_recommendations(
    build,
    *,
    session_id: str | None = None,
    user_id: int | None = None,
    trace_id: str | None = None,
    vehicle_verified: bool = True,
) -> Optional[list[dict]]:
    """
    Generate mod recommendations for a saved build.
    Returns list of dicts on success, None if unavailable/invalid — caller
    (build_service.create_build) falls back to the mock engine in that case.

    vehicle_verified: whether services/vehicle_service.check_vehicle matched
    this exact year/make/model against the catalog. Defaults to True so
    existing callers (evals, anything not yet catalog-aware) keep behaving
    exactly as before — only callers that have actually run the check should
    pass False.
    """
    session_id = session_id or f"build-{getattr(build, 'id', 'preview')}"
    trace_id = trace_id or str(uuid.uuid4())
    if settings.anthropic_api_key:
        return _claude_build_recommendations(
            build, session_id=session_id, user_id=user_id, trace_id=trace_id, vehicle_verified=vehicle_verified
        )
    if settings.openai_api_key:
        return _openai_build_recommendations(
            build, session_id=session_id, user_id=user_id, trace_id=trace_id, vehicle_verified=vehicle_verified
        )
    return None


def _claude_build_recommendations(
    build,
    client=None,
    on_usage=None,
    *,
    session_id: str | None = None,
    user_id: int | None = None,
    trace_id: str | None = None,
    vehicle_verified: bool = True,
) -> Optional[list[dict]]:
    """
    client: injected Anthropic-compatible client. Defaults to a real
        anthropic.Anthropic instance. The eval harness (backend/evals/) injects
        a fake client in replay mode so it can exercise this exact validation
        path against a recorded response without hitting the network or
        spending tokens on every CI run.
    on_usage: optional callback invoked with (input_tokens, output_tokens) after
        a successful call. Production code ignores it (no telemetry sink wired
        up yet — that's a separate, not-yet-built feature); the eval harness
        uses it to track cost per golden case.
    """
    try:
        wrapped_client = False
        if client is None:
            posthog_client = analytics.client()
            if posthog_client is None:
                import anthropic
                client = anthropic.Anthropic(
                    api_key=settings.anthropic_api_key,
                    timeout=RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS,
                    max_retries=RECOMMENDATIONS_MAX_RETRIES,
                )
            else:
                from posthog.ai.anthropic import Anthropic
                client = Anthropic(
                    api_key=settings.anthropic_api_key,
                    timeout=RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS,
                    max_retries=RECOMMENDATIONS_MAX_RETRIES,
                    posthog_client=posthog_client,
                )
                wrapped_client = True

        request_args = {
            "model": "claude-sonnet-4-6",
            # 4000, not 8000 — the schema now asks for 5-7 concise mods with
            # short sentence-length text fields instead of 6-10 mods with
            # paragraph-length ones, so there's much less to generate. Lower
            # headroom than 8000 means less tail latency if the model runs
            # on, while still comfortably covering normal-length output.
            "max_tokens": 4000,
            "tools": [RECOMMENDATIONS_TOOL],
            "tool_choice": {"type": "tool", "name": "submit_mod_recommendations"},
            "messages": [{"role": "user", "content": _build_recommendations_prompt(build, vehicle_verified)}],
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(
                session_id or f"build-{getattr(build, 'id', 'evaluation')}",
                trace_id or str(uuid.uuid4()),
                user_id,
            ))
        response = client.messages.create(**request_args)

        if on_usage is not None and getattr(response, "usage", None) is not None:
            on_usage(response.usage.input_tokens, response.usage.output_tokens)

        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if tool_use is None:
            logger.warning("Claude returned no tool_use block for build %s", getattr(build, "id", "?"))
            return None

        # tool_use.input is already a parsed dict — the Anthropic SDK does the
        # JSON parsing. No regex, no markdown-fence stripping, no manual
        # json.loads: structured output replaces all of that.
        recs = _parse_recommendations(
            tool_use.input, build.budget, make=build.make, model=build.model, vehicle_verified=vehicle_verified
        )
        if not recs:
            logger.warning(
                "Claude returned no valid recommendations for build %s after per-item repair",
                getattr(build, "id", "?"),
            )
            return None

        return [rec.model_dump() for rec in recs]

    except Exception:
        logger.exception("Claude recommendation call failed, falling back to mock")
        return None


def _openai_build_recommendations(
    build,
    *,
    session_id: str | None = None,
    user_id: int | None = None,
    trace_id: str | None = None,
    vehicle_verified: bool = True,
) -> Optional[list[dict]]:
    """
    OpenAI fallback path. Uses json_object mode (guarantees parseable JSON,
    not schema-conformant JSON) and then validates through the same
    ModRecommendationsResponse contract Claude's tool use enforces at
    generation time. Not yet migrated to OpenAI's strict json_schema response
    format — that needs Pydantic-schema-to-strict-mode reshaping (all fields
    required, additionalProperties: false everywhere) that wasn't verified
    against a live OPENAI_API_KEY in this environment. Validating post-hoc
    here closes the same reliability gap without that risk.
    """
    try:
        import json
        posthog_client = analytics.client()
        if posthog_client is None:
            from openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS,
                max_retries=RECOMMENDATIONS_MAX_RETRIES,
            )
            wrapped_client = False
        else:
            from posthog.ai.openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS,
                max_retries=RECOMMENDATIONS_MAX_RETRIES,
                posthog_client=posthog_client,
            )
            wrapped_client = True

        prompt = _build_recommendations_prompt(build, vehicle_verified) + (
            '\n\nReturn ONLY a JSON object of the exact shape '
            '{"recommendations": [...]} — no markdown, no other text.'
        )

        request_args = {
            "model": settings.ai_model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.7,
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(
                session_id or f"build-{getattr(build, 'id', 'preview')}",
                trace_id or str(uuid.uuid4()),
                user_id,
            ))
        resp = client.chat.completions.create(**request_args)
        raw = json.loads(resp.choices[0].message.content)

        recs = _parse_recommendations(
            raw, build.budget, make=build.make, model=build.model, vehicle_verified=vehicle_verified
        )
        if not recs:
            logger.warning(
                "OpenAI returned no valid recommendations for build %s after per-item repair",
                getattr(build, "id", "?"),
            )
            return None

        return [rec.model_dump() for rec in recs]
    except Exception:
        logger.exception("OpenAI recommendation call failed, falling back to mock")
        return None


# ── Chat Engine ───────────────────────────────────────────────────────────────
# Chat stays free-text — there's no structured contract to enforce here, the
# advisor is meant to produce prose, not data.

ADVISOR_PERSONA = """You are a knowledgeable, no-BS car enthusiast and mechanic with 15 years of experience.
You've built everything from budget Honda builds to serious track cars. You speak plainly, give real advice,
warn people about common mistakes, and help them get the most from their budget.
You know pricing, difficulty, parts brands, and realistic expectations.
Never be generic. Always tailor advice to the specific car and budget mentioned.
When someone has a tight budget, be honest and help them prioritise.
Use car enthusiast terms naturally but explain them when needed.
Keep responses focused and useful — 3-5 sentences per point maximum."""

MOCK_CHAT_RESPONSES = {
    "greeting": [
        "What's up! Tell me about your build — year, make, model, and what you're trying to accomplish. I'll help you figure out the smartest path forward for your budget.",
        "Hey! Let's talk mods. What are you working with? Give me the car details and your budget and I'll lay out a realistic plan.",
    ],
    "budget_low": [
        "Honestly, with that budget I'd start with the fundamentals before touching anything performance-related. A fresh set of plugs, intake, and a good alignment will transform how the car feels and protect your investment.",
        "That's a tight budget for performance work. Focus on reliability first — timing belt if it's due, fresh fluids, coilovers if you can stretch it. Get the car sorted before adding power.",
    ],
    "budget_mid": [
        "Good budget to work with. I'd stage it: intake and exhaust first for sound and feel, then coilovers and alignment for handling, then tune everything together. You'll have a well-rounded build.",
        "With that budget you can do it right. Prioritise the mechanical stuff first, then go after the fun mods. Don't waste money on chrome trim pieces — put it in suspension and exhaust.",
    ],
    "budget_high": [
        "Now we're talking. With that budget you can do a proper build — forced induction, full suspension setup, brake upgrade, and still have budget left for a proper tune. Let's plan this out in stages.",
        "That opens up a lot of options. I'd approach it in three stages: foundation mods, power mods, then track-oriented finishing. This way you're not waiting to enjoy the car while you save for the big stuff.",
    ],
    "track": [
        "For track use, safety and reliability come first — always. Brakes, tires, and alignment are worth more than power mods on a circuit. Then suspension, then power. That order matters.",
        "Track builds need to be sorted before they're fast. A mishandling car with 400hp is slower and more dangerous than a balanced car with 250hp. Sort the chassis first.",
    ],
    "daily": [
        "For a daily driver, I'd focus on mods that improve the experience without creating headaches — quality coilovers set conservatively, a tasteful exhaust, maybe wheels and tint. Reliability doesn't take a day off.",
        "Daily driven builds need to be liveable. Avoid anything that requires frequent maintenance or makes the car impractical. Intake, exhaust, alignment, and coilovers will make it feel completely different without causing problems.",
    ],
    "default": [
        "Great question. Give me a bit more context about what you're trying to achieve and I can give you a specific recommendation. What's the car being used for primarily?",
        "That depends on a few factors. What's your experience level, and is this a daily driver or more of a project car? That'll change my recommendation significantly.",
        "I've seen that mod done both well and badly. The key is to pair it with the right supporting modifications — what else have you got done on the car so far?",
    ],
}


def generate_chat_response(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict] = None,
    *,
    session_id: str | None = None,
    user_id: int | None = None,
    trace_id: str | None = None,
) -> str:
    """
    Generate a contextual chat response.
    Tries Claude first, then OpenAI, then falls back to mock.
    """
    session_id = session_id or f"chat-{uuid.uuid4()}"
    trace_id = trace_id or str(uuid.uuid4())
    if settings.anthropic_api_key:
        return _claude_chat(message, session_history, vehicle, session_id, user_id, trace_id)
    if settings.openai_api_key:
        return _ai_chat(message, session_history, vehicle, session_id, user_id, trace_id)
    return _mock_chat(message, vehicle)


def _mock_chat(message: str, vehicle: Optional[dict] = None) -> str:
    """Smart mock chat that responds contextually to keywords."""
    msg_lower = message.lower()

    budget = None
    for word in msg_lower.split():
        clean = word.replace("$", "").replace(",", "").replace("k", "000")
        try:
            budget = float(clean)
            break
        except ValueError:
            pass

    if any(w in msg_lower for w in ["hello", "hi", "hey", "start", "help"]):
        return random.choice(MOCK_CHAT_RESPONSES["greeting"])

    if any(w in msg_lower for w in ["track", "circuit", "race", "autocross"]):
        return random.choice(MOCK_CHAT_RESPONSES["track"])

    if any(w in msg_lower for w in ["daily", "commute", "street", "everyday"]):
        return random.choice(MOCK_CHAT_RESPONSES["daily"])

    if budget is not None:
        if budget < 1500:
            return random.choice(MOCK_CHAT_RESPONSES["budget_low"])
        if budget < 5000:
            return random.choice(MOCK_CHAT_RESPONSES["budget_mid"])
        return random.choice(MOCK_CHAT_RESPONSES["budget_high"])

    return random.choice(MOCK_CHAT_RESPONSES["default"])


def _chat_system_blocks(vehicle: Optional[dict] = None) -> list[dict]:
    """Build the `system` param as separate content blocks so the (large,
    byte-identical-across-every-user-and-every-call) persona text can be
    marked cacheable independently of the small per-call vehicle context
    that would otherwise invalidate the cache on every single request.
    Anthropic's prompt caching skips reprocessing the cached block after its
    first hit — pure latency/cost win on the shared portion of the prompt."""
    blocks = [{
        "type": "text",
        "text": ADVISOR_PERSONA,
        "cache_control": {"type": "ephemeral"},
    }]
    if vehicle:
        yr, mk, mo = vehicle.get("year", ""), vehicle.get("make", ""), vehicle.get("model", "")
        if yr or mk or mo:
            blocks.append({
                "type": "text",
                "text": f"The user is working on a {yr} {mk} {mo}. Tailor all advice to this specific platform.",
            })
    return blocks


def _chat_messages(message: str, session_history: list[dict]) -> list[dict]:
    messages = [{"role": m["role"], "content": m["content"]} for m in session_history[-10:]]
    messages.append({"role": "user", "content": message})
    return messages


def _claude_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict],
    session_id: str,
    user_id: int | None,
    trace_id: str,
) -> str:
    """Real AI chat via Anthropic Claude."""
    try:
        posthog_client = analytics.client()
        if posthog_client is None:
            import anthropic
            client = anthropic.Anthropic(
                api_key=settings.anthropic_api_key,
                timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
                max_retries=CHAT_MAX_RETRIES,
            )
            wrapped_client = False
        else:
            from posthog.ai.anthropic import Anthropic
            client = Anthropic(
                api_key=settings.anthropic_api_key,
                timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
                max_retries=CHAT_MAX_RETRIES,
                posthog_client=posthog_client,
            )
            wrapped_client = True

        request_args = {
            "model": "claude-sonnet-4-6",
            "max_tokens": 600,
            "system": _chat_system_blocks(vehicle),
            "messages": _chat_messages(message, session_history),
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(session_id, trace_id, user_id))
        response = client.messages.create(**request_args)
        return response.content[0].text

    except Exception:
        logger.exception("Claude chat call failed, falling back to mock")
        return _mock_chat(message, vehicle)


async def stream_claude_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict],
    session_id: str,
    user_id: int | None,
    trace_id: str,
):
    """Async-generator streaming counterpart to _claude_chat.

    Uses AsyncAnthropic (not the sync client + asyncio.to_thread pattern the
    worker uses) because this runs inside the main API process, which serves
    every concurrent user — blocking its event loop for the duration of a
    chat generation would stall every other in-flight request, not just this
    one caller. Yields text deltas as they arrive; the caller is responsible
    for assembling/persisting the full text and for falling back to the mock
    engine if this raises (mirrors _claude_chat's own except/fallback, which
    can't be reused directly since a generator can't "return" a value after
    partial yields the way a plain function can)."""
    posthog_client = analytics.client()
    if posthog_client is None:
        import anthropic
        client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
            max_retries=CHAT_MAX_RETRIES,
        )
        wrapped_client = False
    else:
        from posthog.ai.anthropic import AsyncAnthropic
        client = AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
            max_retries=CHAT_MAX_RETRIES,
            posthog_client=posthog_client,
        )
        wrapped_client = True

    request_args = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 600,
        "system": _chat_system_blocks(vehicle),
        "messages": _chat_messages(message, session_history),
    }
    if wrapped_client:
        request_args.update(_ai_observability_args(session_id, trace_id, user_id))
    stream_manager = client.messages.stream(**request_args)

    async with stream_manager as stream:
        async for event in stream:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                yield event.delta.text


def _ai_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict],
    session_id: str,
    user_id: int | None,
    trace_id: str,
) -> str:
    """Real AI chat via OpenAI."""
    try:
        posthog_client = analytics.client()
        if posthog_client is None:
            from openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
                max_retries=CHAT_MAX_RETRIES,
            )
            wrapped_client = False
        else:
            from posthog.ai.openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=CHAT_REQUEST_TIMEOUT_SECONDS,
                max_retries=CHAT_MAX_RETRIES,
                posthog_client=posthog_client,
            )
            wrapped_client = True

        system_content = ADVISOR_PERSONA
        if vehicle:
            system_content += f"\n\nThe user is asking about their {vehicle.get('year')} {vehicle.get('make')} {vehicle.get('model')}."

        messages = [{"role": "system", "content": system_content}]
        messages.extend({"role": m["role"], "content": m["content"]} for m in session_history[-10:])
        messages.append({"role": "user", "content": message})

        request_args = {
            "model": settings.ai_model,
            "messages": messages,
            "temperature": 0.8,
            "max_tokens": 400,
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(session_id, trace_id, user_id))
        response = client.chat.completions.create(**request_args)
        return response.choices[0].message.content

    except Exception:
        logger.exception("OpenAI chat call failed, falling back to mock")
        return _mock_chat(message, vehicle)
