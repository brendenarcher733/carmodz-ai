# tests/test_guide_service.py
#
# Covers the on-demand install-guide generator (services/guide_service.py):
# schema validation, the deterministic local fallback, URL encoding of the
# three search links, and failure isolation (an AI failure must fall back
# to the local template, never raise).
#
# These tests never make a real AI call — backend/.env carries a real
# ANTHROPIC_API_KEY that pydantic-settings loads even under pytest, so every
# test here either blanks it first or monkeypatches the provider function
# directly, same convention as tests/test_plans_preview.py's no_real_ai fixture.

import pytest
from pydantic import ValidationError

from core.config import settings
from models.guide import GuideRequest, InstallGuideContent
from services.guide_service import build_search_links, generate_install_guide


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")


def _request(**overrides):
    base = dict(
        name="Cat-Back Exhaust System", category="sound", difficulty="medium",
        suggested_search_terms=["Borla S-Type cat-back exhaust"],
        year=2018, make="Honda", model="Civic Si",
    )
    base.update(overrides)
    return GuideRequest(**base)


# ── GuideRequest / InstallGuideContent schema validation ────────────────────

def test_guide_request_rejects_unknown_category():
    with pytest.raises(ValidationError):
        _request(category="engine-swap")


def test_guide_request_rejects_unknown_difficulty():
    with pytest.raises(ValidationError):
        _request(difficulty="extreme")


def test_guide_request_rejects_surprise_fields():
    with pytest.raises(ValidationError):
        GuideRequest(
            name="x", category="sound", difficulty="easy", year=2018, make="Honda", model="Civic",
            exact_price=199.99,  # not part of the contract
        )


def test_install_guide_content_rejects_more_than_five_steps():
    with pytest.raises(ValidationError):
        InstallGuideContent(steps=["one", "two", "three", "four", "five", "six"])


def test_install_guide_content_requires_at_least_one_step():
    with pytest.raises(ValidationError):
        InstallGuideContent(steps=[])


def test_install_guide_content_allows_null_estimated_time_and_safety_note():
    """Core requirement: omit (null) the estimate/safety note when there's
    no reasonable basis for one, rather than inventing something."""
    content = InstallGuideContent(steps=["Install the part per manufacturer instructions."])
    assert content.estimated_time is None
    assert content.safety_note is None


def test_install_guide_content_caps_long_list_items():
    content = InstallGuideContent(
        parts_to_confirm=["x" * 300],
        tools=["y" * 300],
        steps=["z" * 300],
    )
    assert len(content.parts_to_confirm[0]) <= 120
    assert len(content.tools[0]) <= 60
    assert len(content.steps[0]) <= 160


# ── Deterministic local fallback (no AI provider configured) ───────────────

def test_generate_install_guide_falls_back_to_local_template_when_unconfigured():
    guide = generate_install_guide(_request())
    assert len(guide.steps) >= 1
    assert len(guide.steps) <= 5
    assert guide.difficulty == "medium"  # copied from the request, never from AI


def test_mock_fallback_never_invents_a_brand_or_part_number():
    """The local template only ever names the mod generically and defers to
    the manufacturer/installer — spot-check it doesn't smuggle in a brand
    name that was never given to it."""
    guide = generate_install_guide(_request(name="Cat-Back Exhaust System"))
    full_text = " ".join(guide.steps) + " " + (guide.safety_note or "")
    assert "Borla" not in full_text  # a real brand, never passed to the generator
    assert "manufacturer" in full_text.lower() or "installer" in full_text.lower()


def test_mock_fallback_estimated_time_is_keyed_to_difficulty():
    easy = generate_install_guide(_request(difficulty="easy"))
    hard = generate_install_guide(_request(difficulty="hard"))
    assert easy.estimated_time != hard.estimated_time
    assert easy.estimated_time is not None
    assert hard.estimated_time is not None


def test_mock_fallback_is_category_aware():
    sound = generate_install_guide(_request(category="sound", name="Axle-Back Exhaust"))
    interior = generate_install_guide(_request(category="interior", name="Bucket Seats"))
    assert sound.tools != interior.tools


@pytest.mark.parametrize("category", ["performance", "handling", "sound", "cosmetic", "reliability", "interior"])
def test_mock_fallback_covers_every_recommendation_category(category):
    guide = generate_install_guide(_request(category=category))
    assert len(guide.tools) > 0
    assert len(guide.steps) >= 1


# ── Deterministic, URL-encoded search links ─────────────────────────────────

def test_search_links_are_url_encoded():
    parts_url, video_url, docs_url = build_search_links(2018, "Honda", "Civic Si", "Cat-Back Exhaust System")
    for url in (parts_url, video_url, docs_url):
        assert " " not in url  # spaces must be percent/plus-encoded, not raw
        assert "+" in url or "%20" in url


def test_search_links_use_expected_search_engines_only():
    parts_url, video_url, docs_url = build_search_links(2018, "Honda", "Civic Si", "Cold Air Intake")
    assert parts_url.startswith("https://www.google.com/search?q=")
    assert video_url.startswith("https://www.youtube.com/results?search_query=")
    assert docs_url.startswith("https://www.google.com/search?q=")


def test_search_links_include_vehicle_and_mod_name():
    from urllib.parse import unquote_plus

    parts_url, video_url, docs_url = build_search_links(2018, "Honda", "Civic Si", "Cold Air Intake")
    for url in (parts_url, video_url, docs_url):
        decoded = unquote_plus(url)
        assert "2018" in decoded and "Honda" in decoded and "Civic Si" in decoded and "Cold Air Intake" in decoded


def test_search_links_differ_by_intent():
    parts_url, video_url, docs_url = build_search_links(2018, "Honda", "Civic Si", "Cold Air Intake")
    assert "install" in video_url.lower()
    assert "forum" in docs_url.lower()
    assert parts_url != docs_url


def test_guide_response_includes_all_three_links():
    guide = generate_install_guide(_request())
    assert guide.parts_search_url
    assert guide.video_search_url
    assert guide.docs_search_url


def test_special_characters_in_name_are_safely_encoded():
    """Names can contain things like '/', '&', or non-ASCII characters —
    confirm the URL stays well-formed either way."""
    parts_url, _, _ = build_search_links(2018, "Mercedes-Benz", "C-Class", "Intake Sound Enhancer / Pod Filter")
    assert "http" in parts_url
    assert " " not in parts_url


# ── Failure isolation — an AI failure must fall back, never raise ──────────

def test_claude_failure_falls_back_to_local_template(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "fake-key-for-isolation-test")
    monkeypatch.setattr("services.guide_service._claude_guide", lambda request: None)

    guide = generate_install_guide(_request())  # must not raise
    assert guide.difficulty == "medium"
    assert len(guide.steps) >= 1


def test_openai_failure_falls_back_to_local_template(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "fake-key-for-isolation-test")
    monkeypatch.setattr("services.guide_service._openai_guide", lambda request: None)

    guide = generate_install_guide(_request())
    assert guide.difficulty == "medium"
    assert len(guide.steps) >= 1


def test_claude_guide_returns_none_rather_than_raising_on_a_bad_response(monkeypatch):
    """_claude_guide's own contract: any exception while handling the
    response (malformed tool input, missing tool_use block, whatever)
    returns None, it never propagates — exactly like
    _claude_build_recommendations in services/ai_service.py. Injects a fake
    client so this never touches the network."""
    from services.guide_service import _claude_guide

    class _FakeResponse:
        content = []  # no tool_use block at all

    class _FakeMessages:
        @staticmethod
        def create(**kwargs):
            return _FakeResponse()

    class _FakeClient:
        messages = _FakeMessages()

    monkeypatch.setattr(settings, "anthropic_api_key", "fake-key-for-isolation-test")
    monkeypatch.setattr("anthropic.Anthropic", lambda **kwargs: _FakeClient())

    result = _claude_guide(_request())
    assert result is None
