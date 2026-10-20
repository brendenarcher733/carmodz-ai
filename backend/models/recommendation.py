# models/recommendation.py
# Mod recommendations linked to a build

from datetime import datetime
from typing import Literal, Optional

from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from pydantic import BaseModel, ConfigDict, Field, field_validator

from core.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id          = Column(Integer, primary_key=True, index=True)
    build_id    = Column(Integer, ForeignKey("builds.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(200), nullable=False)
    category    = Column(String(100), nullable=False)
    price_min   = Column(Float, nullable=False)
    price_max   = Column(Float, nullable=False)
    difficulty  = Column(String(50), nullable=False)  # easy|medium|hard
    stage       = Column(Integer, nullable=False)     # 1, 2, 3
    priority    = Column(Integer, nullable=False)     # 1=highest
    # Short, structured fields — replaced a free-text `description` +
    # `warnings`/`brand_tips` lists that let the model ramble, which is what
    # drove slow generations and validation failures on one chatty field.
    why                   = Column(Text, nullable=False)                                   # 1-2 sentences: why this mod, for this build
    impact                = Column(String(200), nullable=False, server_default="", default="")  # 1 short sentence: what measurably improves
    compatibility_note    = Column(String(200), nullable=False, server_default="", default="")  # 1 short sentence, or "" — a real fitment caveat
    tradeoff               = Column(String(200), nullable=False, server_default="", default="")  # 1 short sentence, or "" — the honest downside
    suggested_search_terms = Column(JSON, default=list)   # 1-3 short shopping search phrases, e.g. "K&N cold air intake"
    # Phase 2 — vehicle-aware fitment (see services/fitment_service.py).
    # Deliberately NOT AI-generated: computed by our own code after the AI
    # response is already validated, never asked of the model. "unknown" is
    # the honest default for anything we have no confident signal about —
    # never upgraded to "verified" except by curated data (mock_ai.MOD_LIBRARY).
    fitment_status = Column(String(20), nullable=False, server_default="unknown", default="unknown")
    fitment_reason = Column(String(160), nullable=True)
    fitment_source = Column(String(80), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    build = relationship("Build", back_populates="recommendations")


# ── AI output contract ──────────────────────────────────────────────────────
# This model is the single source of truth for what a mod recommendation looks
# like. It's used in three places that all need to agree:
#   1. The JSON Schema handed to Claude as a tool's input_schema (generation-time
#      constraint — the model literally cannot emit an out-of-range value)
#   2. Runtime validation of whatever the AI provider actually returns
#      (defense against model deviation, regardless of provider)
#   3. The DB-backed response shape used elsewhere in the app
#
# Field-level constraints (Literal, ge/le, max_length) become "type", "enum",
# "minimum"/"maximum" in the generated JSON Schema. Cross-field relationships
# (price_max >= price_min) can't be expressed in JSON Schema at all — that's
# what the field_validator below is for. Structured output and Pydantic
# validation are complementary, not redundant: one constrains generation,
# the other guards business invariants the schema format can't express.

class ModRecommendation(BaseModel):
    # extra="forbid" does double duty: at validation time it rejects any
    # surprise field the model invents; at schema-generation time it's what
    # makes Pydantic emit "additionalProperties": false, which Anthropic's
    # strict tool mode requires on every object in the schema.
    model_config = ConfigDict(extra="forbid")

    name:        str = Field(..., min_length=1, max_length=200)
    # Without an enum here, nothing stops the model from inventing a category
    # like "Engine / Tuning" that doesn't match what the rest of the app
    # expects (e.g. BuildDetail.jsx's HP-gain estimator filters on
    # mod.category === 'performance' — a free-text mismatch fails silently).
    # This was a latent bug in the pre-refactor prompt-only version too; the
    # enum constraint actually fixes it, not just preserves prior behavior.
    category:    Literal["performance", "handling", "sound", "cosmetic", "reliability", "interior"]
    price_min:   float = Field(..., ge=0, le=200_000)
    price_max:   float = Field(..., ge=0, le=200_000)
    difficulty:  Literal["easy", "medium", "hard"]
    stage:       int = Field(..., ge=1, le=3)
    priority:    int = Field(..., ge=1, le=20)
    # Short, structured fields — deliberately replace a free-text `description`
    # plus `warnings`/`brand_tips` lists (see git history) that let the model
    # write paragraphs. Shorter fields mean less generated text per mod, which
    # is the main lever on generation latency, and fewer ways for one chatty
    # field to fail validation and discard an otherwise-good response.
    why:                    str = Field(..., min_length=1, max_length=220)
    impact:                 str = Field(default="", max_length=160)
    compatibility_note:     str = Field(default="", max_length=160)
    tradeoff:                str = Field(default="", max_length=160)
    # Shopping search phrases (brand + product type, e.g. "K&N cold air
    # intake") — not a guess at an exact SKU. Replaces the old `exact_product`
    # single field, which pushed the model toward naming a specific part
    # number/trim it often wasn't actually confident about.
    suggested_search_terms: list[str] = Field(default=[], max_length=3)

    @field_validator("suggested_search_terms")
    @classmethod
    def _cap_search_term_length(cls, v: list[str]) -> list[str]:
        return [t[:80] for t in v]

    @field_validator("price_max")
    @classmethod
    def price_max_at_least_price_min(cls, v: float, info) -> float:
        price_min = info.data.get("price_min")
        if price_min is not None and v < price_min:
            raise ValueError(f"price_max ({v}) must be >= price_min ({price_min})")
        return v


class EvaluatedModRecommendation(ModRecommendation):
    """ModRecommendation plus the three fitment fields — deliberately a
    SEPARATE class, not fields added directly to ModRecommendation, because
    ModRecommendation also backs the Anthropic tool schema
    (ai_service.RECOMMENDATIONS_TOOL): adding fitment fields there would put
    them in front of the model as something to fill in, which is exactly
    what requirement 1 of the Phase 2 spec forbids ("Do not make these
    verbose AI-generated fields. They are business-validation fields").
    This class is never referenced by ModRecommendationsResponse, so it's
    invisible to schema generation — these fields are only ever set by our
    own code, after the AI's output has already been validated.

    See services/fitment_service.py for how these are computed.
    """
    fitment_status: Literal["verified", "unknown", "incompatible"] = "unknown"
    fitment_reason: Optional[str] = Field(default=None, max_length=160)
    fitment_source: Optional[str] = Field(default=None, max_length=80)


class ModRecommendationsResponse(BaseModel):
    """Wrapper required because tool input_schema must be a JSON object at the
    root — a bare JSON array isn't a valid top-level tool input shape."""
    model_config = ConfigDict(extra="forbid")

    # 5-7 by default; the prompt allows fewer (down to 3) for small budgets
    # rather than padding the list to hit a count. Note: Anthropic strict
    # tool mode strips minItems/maxItems at generation time (see
    # ai_service._STRICT_UNSUPPORTED_KEYS), so this bound isn't enforced on
    # Claude's output structurally — it documents intent and is honored by
    # the prompt plus services/ai_service.py's own repair/trim logic.
    recommendations: list[ModRecommendation] = Field(..., min_length=3, max_length=7)


class RecommendationResponse(ModRecommendation):
    id:         int
    build_id:   int
    created_at: datetime

    class Config:
        from_attributes = True


class ModPlan(BaseModel):
    """Full plan returned by the recommendation engine."""
    build_id:           int
    # Vehicle identity — passed through so the frontend can display them
    title:              str
    year:               int
    make:               str
    model:              str
    goal:               str
    budget:             float
    # Mod recommendations
    mods:               list[EvaluatedModRecommendation]
    total_min:          float
    total_max:          float
    budget_remaining:   float
    budget_warning:     Optional[str] = None
    summary:            str
    stage_breakdown:    dict[str, list[str]]   # {"Stage 1": ["mod name", ...]}
    used_mock_fallback: bool = False
    # True only if this exact year/make/model matched the vehicle catalog
    # (services/vehicle_service.check_vehicle) — False means "not yet in the
    # catalog," not "wrong." A known-invalid year never reaches this far; see
    # routers/plans.py and services/build_service.create_build, which reject
    # that case before a plan is ever generated.
    vehicle_verified:   bool = False
