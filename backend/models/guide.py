# models/guide.py
# On-demand install guide for a single recommendation — generated lazily
# when a user expands a ModCard's "Install guide" control, never as part of
# the initial recommendation-generation response (see services/ai_service.py,
# which stays completely untouched by this feature).
#
# Stateless by design: nothing here is ever persisted (requirement: don't
# persist anonymous guide data unless the architecture already supports it
# safely — it doesn't, so neither path persists anything). A guide is
# computed fresh from the recommendation's own fields plus the vehicle,
# both of which the frontend already has in memory — no DB lookup, no
# migration, works identically for an authenticated build or an anonymous,
# never-saved preview.

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GuideRequest(BaseModel):
    """What the frontend already has for any rendered ModCard — no
    recommendation ID needed, since nothing is looked up from the DB."""
    model_config = ConfigDict(extra="forbid")

    name:       str = Field(..., min_length=1, max_length=200)
    # Same enums as models.recommendation.ModRecommendation — reusing the
    # existing contract rather than inventing a second one.
    category:   Literal["performance", "handling", "sound", "cosmetic", "reliability", "interior"]
    difficulty: Literal["easy", "medium", "hard"]
    # Optional extra context — the recommendation's own search terms give
    # the guide (and the deterministic parts-search link) a better-targeted
    # query than the bare mod name alone, when available.
    suggested_search_terms: list[str] = Field(default=[], max_length=3)

    year:  int = Field(..., ge=1950, le=2100)
    make:  str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=150)


def _cap_item_length(items: list[str], max_len: int) -> list[str]:
    return [i.strip()[:max_len] for i in items if isinstance(i, str) and i.strip()]


class InstallGuideContent(BaseModel):
    """What the AI (or the local fallback) actually produces. Deliberately
    excludes `difficulty` — that's already known from the GuideRequest, so
    it's never asked of the model, only copied straight through (see
    InstallGuide below) — one less thing to generate, one less way for the
    model to contradict a fact we already have.

    extra="forbid" does the same double duty it does on ModRecommendation:
    rejects any surprise field at validation time, and makes Pydantic emit
    additionalProperties: false for Anthropic's strict tool mode.
    """
    model_config = ConfigDict(extra="forbid")

    parts_to_confirm: list[str] = Field(default=[], max_length=6)
    tools:             list[str] = Field(default=[], max_length=8)
    # Nullable on purpose — a rough, generic range tied to difficulty is
    # fine, but there's no reasonable basis for one in every case, and
    # guessing one anyway is exactly the invented-detail problem this
    # feature exists to avoid. See services/guide_service.py.
    estimated_time:    Optional[str] = Field(default=None, max_length=40)
    steps:             list[str] = Field(default=[], min_length=1, max_length=5)
    safety_note:       Optional[str] = Field(default=None, max_length=200)

    @field_validator("parts_to_confirm")
    @classmethod
    def _cap_parts(cls, v: list[str]) -> list[str]:
        return _cap_item_length(v, 120)

    @field_validator("tools")
    @classmethod
    def _cap_tools(cls, v: list[str]) -> list[str]:
        return _cap_item_length(v, 60)

    @field_validator("steps")
    @classmethod
    def _cap_steps(cls, v: list[str]) -> list[str]:
        return _cap_item_length(v, 160)


class InstallGuide(InstallGuideContent):
    """The full response: AI/fallback content, plus the three deterministic
    search links (services/guide_service.build_search_links) and the
    difficulty copied straight from the request. URLs are NEVER produced by
    the model — see that module for why."""
    difficulty: Literal["easy", "medium", "hard"]
    parts_search_url: str
    video_search_url: str
    docs_search_url:  str
