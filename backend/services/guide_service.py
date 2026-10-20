# services/guide_service.py
#
# Lazy, on-demand install-guide generation for one recommendation — invoked
# only when a user expands a ModCard's "Install guide" control (see
# routers/guides.py). Never part of the initial recommendation-generation
# prompt or response (services/ai_service.py is untouched by this feature)
# — a separate, smaller, optional call keeps initial plan generation at its
# existing latency.
#
# Reuses services/ai_service.py's established provider-fallback convention
# rather than inventing a second one: Claude (tool-forced structured
# output) > OpenAI (json_object mode) > a deterministic, fully local
# fallback that always succeeds — same "any exception falls back silently,
# never raises" philosophy as _claude_build_recommendations /
# _openai_build_recommendations. No new AI provider, no external research
# or scraping call of any kind.

import logging
import uuid
from typing import Optional
from urllib.parse import quote_plus

from core.config import settings
from models.guide import GuideRequest, InstallGuide, InstallGuideContent
from services.ai_service import _ai_observability_args, _strict_safe_schema

logger = logging.getLogger(__name__)

# A guide is a small, bounded payload (at most 5 short steps, a handful of
# short list items) — much smaller than a 5-7 mod recommendation set, so it
# gets a tighter budget on both axes. max_retries=0 for the same reason
# RECOMMENDATIONS_MAX_RETRIES is 0: this call already has its own instant
# local fallback, so an SDK-internal retry would only add latency the user
# is actively waiting through, never improve reliability.
GUIDE_MAX_RETRIES = 0
GUIDE_REQUEST_TIMEOUT_SECONDS = 20
GUIDE_MAX_TOKENS = 700

GUIDE_TOOL = {
    "name": "submit_install_guide",
    "description": (
        "Submit a concise, generic installation guide for one aftermarket "
        "vehicle modification."
    ),
    "input_schema": _strict_safe_schema(InstallGuideContent.model_json_schema()),
    "strict": True,
}

# Generic, category-keyed fallback content — used whenever no AI provider is
# configured, or any AI call fails. Deliberately conservative: no specific
# brand/SKU/torque claims, every list short, always defers to the
# manufacturer or a qualified installer for anything safety-critical.
_CATEGORY_TOOL_TEMPLATES: dict[str, dict] = {
    "performance": {
        "tools": ["Socket and ratchet set", "Jack and jack stands", "Torque wrench"],
        "parts_to_confirm": [
            "Confirm the kit matches your engine/trim before ordering",
            "Check whether gaskets or clamps are included or sold separately",
        ],
    },
    "handling": {
        "tools": ["Socket and ratchet set", "Jack and jack stands", "Torque wrench", "Spring compressor (if applicable)"],
        "parts_to_confirm": [
            "Confirm the kit is specified for your exact chassis/trim",
            "Book an alignment for after install",
        ],
    },
    "sound": {
        "tools": ["Socket and ratchet set", "Jack and jack stands", "Penetrant/anti-seize spray"],
        "parts_to_confirm": [
            "Confirm the kit matches your exact exhaust/flange configuration",
            "Check whether new gaskets or hangers are included",
        ],
    },
    "cosmetic": {
        "tools": ["Trim removal tool set", "Microfiber cloths", "Isopropyl alcohol (surface prep)"],
        "parts_to_confirm": [
            "Confirm color/finish and size match your exact trim",
        ],
    },
    "reliability": {
        "tools": ["Socket and ratchet set", "Drain pan", "Torque wrench"],
        "parts_to_confirm": [
            "Confirm the part number matches your engine code/model year",
        ],
    },
    "interior": {
        "tools": ["Trim removal tool set", "Screwdriver set", "Socket and ratchet set"],
        "parts_to_confirm": [
            "Confirm mounting points match your seat rails/trim",
        ],
    },
}

_DIFFICULTY_TIME_ESTIMATE = {
    "easy": "30–90 minutes",
    "medium": "2–4 hours",
    "hard": "4+ hours (or a shop)",
}


def build_search_links(year: int, make: str, model: str, name: str) -> tuple[str, str, str]:
    """Deterministic, URL-encoded search-query links — never produced by the
    model (requirement: "Do not let the model return arbitrary URLs").
    Plain search-engine queries only, same reasoning ShopLinks.jsx already
    uses for its own retailer links: stable, documented URL patterns, no
    API key or scraping involved."""
    base_query = f"{year} {make} {model} {name}".strip()
    parts_url = f"https://www.google.com/search?q={quote_plus(base_query)}"
    video_url = f"https://www.youtube.com/results?search_query={quote_plus(base_query + ' install')}"
    docs_url = f"https://www.google.com/search?q={quote_plus(base_query + ' install guide forum')}"
    return parts_url, video_url, docs_url


def _mock_guide_content(request: GuideRequest) -> InstallGuideContent:
    """Fully local, deterministic fallback — always succeeds, no network
    call. Used whenever no AI provider is configured or any AI call fails."""
    template = _CATEGORY_TOOL_TEMPLATES.get(request.category, _CATEGORY_TOOL_TEMPLATES["performance"])
    return InstallGuideContent(
        parts_to_confirm=template["parts_to_confirm"],
        tools=template["tools"],
        estimated_time=_DIFFICULTY_TIME_ESTIMATE.get(request.difficulty),
        steps=[
            f"Confirm the {request.name} kit contents and fitment for your {request.year} {request.make} {request.model} before starting.",
            "Read the manufacturer's included instructions in full before beginning work.",
            "Safely raise and secure the vehicle if needed, and remove any panels required for access.",
            "Install the new part following the manufacturer's instructions, torquing fasteners to their spec.",
            "Reassemble, then verify operation and check for leaks, noises, or warning lights before normal driving.",
        ],
        safety_note=(
            "Always follow the manufacturer's official instructions and torque specifications — "
            "confirm with a qualified installer if you're unsure about any step."
        ),
    )


def _build_guide_prompt(request: GuideRequest) -> str:
    return f"""You are a car modification installation expert. Provide a concise,
generic installation guide for this specific modification by calling the
submit_install_guide tool.

Vehicle: {request.year} {request.make} {request.model}
Modification: {request.name} ({request.category}, {request.difficulty} difficulty)

This must be SAFE, GENERIC, and HONEST — not a precise step-by-step procedure:
- parts_to_confirm: up to 4 short, generic things to verify before buying (e.g.
  "Confirm thread pitch matches your hub", "Check whether gaskets are included") —
  never a specific brand, SKU, or part number. Empty list if nothing applies.
- tools: up to 6 short, common tool names appropriate for a job of this difficulty.
- estimated_time: ONE short, rough, GENERIC time range appropriate to the stated
  difficulty (e.g. "2-4 hours") — not a precise claim about this exact install.
  Return null if you cannot support even a rough range.
- steps: at most 5 short, high-level steps. Do NOT include exact torque values,
  exact part numbers, or any safety-critical specifics you cannot verify — say
  "per manufacturer instructions" instead.
- safety_note: one short sentence if there's a genuine safety consideration for
  this category of work (e.g. jack safety, brake bleeding, electrical
  disconnection) — or null if there's nothing beyond standard shop safety.

NEVER invent exact part numbers, prices, fitment confirmation, or torque specs.
If a detail isn't established, say it needs confirmation from the manufacturer
or a qualified installer instead of guessing."""


def _claude_guide(request: GuideRequest) -> Optional[InstallGuideContent]:
    try:
        from core import analytics

        posthog_client = analytics.client()
        if posthog_client is None:
            import anthropic
            client = anthropic.Anthropic(
                api_key=settings.anthropic_api_key,
                timeout=GUIDE_REQUEST_TIMEOUT_SECONDS,
                max_retries=GUIDE_MAX_RETRIES,
            )
            wrapped_client = False
        else:
            from posthog.ai.anthropic import Anthropic
            client = Anthropic(
                api_key=settings.anthropic_api_key,
                timeout=GUIDE_REQUEST_TIMEOUT_SECONDS,
                max_retries=GUIDE_MAX_RETRIES,
                posthog_client=posthog_client,
            )
            wrapped_client = True

        request_args = {
            "model": "claude-sonnet-4-6",
            "max_tokens": GUIDE_MAX_TOKENS,
            "tools": [GUIDE_TOOL],
            "tool_choice": {"type": "tool", "name": "submit_install_guide"},
            "messages": [{"role": "user", "content": _build_guide_prompt(request)}],
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(
                f"guide-{request.name}", uuid.uuid4().hex, None,
            ))
        response = client.messages.create(**request_args)

        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if tool_use is None:
            logger.warning("Claude returned no tool_use block for install guide of %r", request.name)
            return None

        return InstallGuideContent.model_validate(tool_use.input)

    except Exception:
        logger.exception("Claude install-guide call failed, falling back to local template")
        return None


def _openai_guide(request: GuideRequest) -> Optional[InstallGuideContent]:
    try:
        import json
        from core import analytics

        posthog_client = analytics.client()
        if posthog_client is None:
            from openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=GUIDE_REQUEST_TIMEOUT_SECONDS,
                max_retries=GUIDE_MAX_RETRIES,
            )
            wrapped_client = False
        else:
            from posthog.ai.openai import OpenAI
            client = OpenAI(
                api_key=settings.openai_api_key,
                timeout=GUIDE_REQUEST_TIMEOUT_SECONDS,
                max_retries=GUIDE_MAX_RETRIES,
                posthog_client=posthog_client,
            )
            wrapped_client = True

        prompt = _build_guide_prompt(request) + (
            '\n\nReturn ONLY a JSON object with keys parts_to_confirm, tools, '
            'estimated_time, steps, safety_note — no markdown, no other text.'
        )
        request_args = {
            "model": settings.ai_model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.5,
        }
        if wrapped_client:
            request_args.update(_ai_observability_args(
                f"guide-{request.name}", uuid.uuid4().hex, None,
            ))
        resp = client.chat.completions.create(**request_args)
        raw = json.loads(resp.choices[0].message.content)
        return InstallGuideContent.model_validate(raw)

    except Exception:
        logger.exception("OpenAI install-guide call failed, falling back to local template")
        return None


def generate_install_guide(request: GuideRequest) -> InstallGuide:
    """Always succeeds — mirrors services/ai_service.py's own
    AI-then-mock-fallback philosophy. A guide failure is never allowed to
    surface as an error to the caller; the worst case is the deterministic
    local template, not an exception (requirement: a guide failure must
    never fail the build/preview/initial-recommendation flow — this
    function simply can't fail in the first place)."""
    content: Optional[InstallGuideContent] = None
    if settings.anthropic_api_key:
        content = _claude_guide(request)
    elif settings.openai_api_key:
        content = _openai_guide(request)

    if content is None:
        content = _mock_guide_content(request)

    parts_url, video_url, docs_url = build_search_links(request.year, request.make, request.model, request.name)
    return InstallGuide(
        **content.model_dump(),
        difficulty=request.difficulty,
        parts_search_url=parts_url,
        video_search_url=video_url,
        docs_search_url=docs_url,
    )
