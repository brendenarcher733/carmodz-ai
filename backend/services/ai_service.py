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
from typing import Optional

from pydantic import ValidationError

from core.config import settings
from models.recommendation import ModRecommendationsResponse

logger = logging.getLogger(__name__)


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


class RecommendationValidationError(Exception):
    """Raised when an AI provider returns a structurally valid but
    semantically wrong recommendation set (e.g. blows the budget)."""


def _validate_recommendation_set(parsed: ModRecommendationsResponse, budget: float) -> None:
    """Business-rule checks that JSON Schema can't express on its own.

    Type/range/enum constraints are already enforced by ModRecommendationsResponse
    at the Pydantic layer (and, for Claude, at generation time via the tool
    schema). This layer catches cross-record invariants — duplicate parts,
    budget blowouts — that only make sense in the context of the full set.
    """
    recs = parsed.recommendations

    names = [r.name.strip().lower() for r in recs]
    if len(names) != len(set(names)):
        raise RecommendationValidationError("Duplicate mod names in recommendation set")

    total_min = sum(r.price_min for r in recs)
    # The prompt instructs the model to stay within budget; this is the actual
    # enforcement. 15% slack tolerates reasonable estimation variance without
    # accepting a recommendation set that's wildly over budget.
    if total_min > budget * 1.15:
        raise RecommendationValidationError(
            f"Total minimum cost ${total_min:,.0f} exceeds budget ${budget:,.0f} by more than 15%"
        )


def _build_recommendations_prompt(build) -> str:
    usage_label = "Daily Driver" if getattr(build, "is_daily", True) else "Project / Track Car"
    categories  = ", ".join(build.categories) if build.categories else "performance, handling"
    notes_line  = f"\nUser notes: {build.notes}" if getattr(build, "notes", "") else ""

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
- Be SPECIFIC to the {build.year} {build.make} {build.model} — name real parts that exist for this platform
- Sum of price_min across all recommendations must not exceed ${build.budget:,.0f}
- Recommend 6-10 mods total
- Stage 1 mods should fit within the first 50% of budget
- Beginner builds: avoid stage 3 and "hard" difficulty
- Prioritise reliability/foundation work before power mods if high mileage or beginner
- Use real brands: K&N, Borla, Cobb, KW, Brembo, Mishimoto, etc."""


def generate_build_recommendations(build) -> Optional[list[dict]]:
    """
    Generate mod recommendations for a saved build.
    Returns list of dicts on success, None if unavailable/invalid — caller
    (build_service.create_build) falls back to the mock engine in that case.
    """
    if settings.anthropic_api_key:
        return _claude_build_recommendations(build)
    if settings.openai_api_key:
        return _openai_build_recommendations(build)
    return None


def _claude_build_recommendations(
    build,
    client=None,
    on_usage=None,
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
        if client is None:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            tools=[RECOMMENDATIONS_TOOL],
            tool_choice={"type": "tool", "name": "submit_mod_recommendations"},
            messages=[{"role": "user", "content": _build_recommendations_prompt(build)}],
        )

        if on_usage is not None and getattr(response, "usage", None) is not None:
            on_usage(response.usage.input_tokens, response.usage.output_tokens)

        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if tool_use is None:
            logger.warning("Claude returned no tool_use block for build %s", getattr(build, "id", "?"))
            return None

        # tool_use.input is already a parsed dict — the Anthropic SDK does the
        # JSON parsing. No regex, no markdown-fence stripping, no manual
        # json.loads: structured output replaces all of that.
        parsed = ModRecommendationsResponse.model_validate(tool_use.input)
        _validate_recommendation_set(parsed, build.budget)

        return [rec.model_dump() for rec in parsed.recommendations]

    except (ValidationError, RecommendationValidationError) as e:
        logger.warning("Claude recommendation validation failed, falling back to mock: %s", e)
        return None
    except Exception:
        logger.exception("Claude recommendation call failed, falling back to mock")
        return None


def _openai_build_recommendations(build) -> Optional[list[dict]]:
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
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        prompt = _build_recommendations_prompt(build) + (
            '\n\nReturn ONLY a JSON object of the exact shape '
            '{"recommendations": [...]} — no markdown, no other text.'
        )

        resp = client.chat.completions.create(
            model=settings.ai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        raw = json.loads(resp.choices[0].message.content)

        parsed = ModRecommendationsResponse.model_validate(raw)
        _validate_recommendation_set(parsed, build.budget)

        return [rec.model_dump() for rec in parsed.recommendations]

    except (ValidationError, RecommendationValidationError) as e:
        logger.warning("OpenAI recommendation validation failed, falling back to mock: %s", e)
        return None
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
) -> str:
    """
    Generate a contextual chat response.
    Tries Claude first, then OpenAI, then falls back to mock.
    """
    if settings.anthropic_api_key:
        return _claude_chat(message, session_history, vehicle)
    if settings.openai_api_key:
        return _ai_chat(message, session_history, vehicle)
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


def _claude_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict] = None,
) -> str:
    """Real AI chat via Anthropic Claude."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_content = ADVISOR_PERSONA
        if vehicle:
            yr, mk, mo = vehicle.get("year", ""), vehicle.get("make", ""), vehicle.get("model", "")
            if yr or mk or mo:
                system_content += f"\n\nThe user is working on a {yr} {mk} {mo}. Tailor all advice to this specific platform."

        messages = [{"role": m["role"], "content": m["content"]} for m in session_history[-10:]]
        messages.append({"role": "user", "content": message})

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=system_content,
            messages=messages,
        )
        return response.content[0].text

    except Exception:
        logger.exception("Claude chat call failed, falling back to mock")
        return _mock_chat(message, vehicle)


def _ai_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict] = None,
) -> str:
    """Real AI chat via OpenAI."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        system_content = ADVISOR_PERSONA
        if vehicle:
            system_content += f"\n\nThe user is asking about their {vehicle.get('year')} {vehicle.get('make')} {vehicle.get('model')}."

        messages = [{"role": "system", "content": system_content}]
        messages.extend({"role": m["role"], "content": m["content"]} for m in session_history[-10:])
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            temperature=0.8,
            max_tokens=400,
        )
        return response.choices[0].message.content

    except Exception:
        logger.exception("OpenAI chat call failed, falling back to mock")
        return _mock_chat(message, vehicle)
