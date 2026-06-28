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
    description = Column(Text, nullable=False)
    price_min   = Column(Float, nullable=False)
    price_max   = Column(Float, nullable=False)
    difficulty  = Column(String(50), nullable=False)  # easy|medium|hard
    stage       = Column(Integer, nullable=False)     # 1, 2, 3
    priority    = Column(Integer, nullable=False)     # 1=highest
    warnings    = Column(JSON, default=list)          # list of warning strings
    brand_tips  = Column(JSON, default=list)          # suggested brands
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
    description: str = Field(..., min_length=1, max_length=1000)
    price_min:   float = Field(..., ge=0, le=200_000)
    price_max:   float = Field(..., ge=0, le=200_000)
    difficulty:  Literal["easy", "medium", "hard"]
    stage:       int = Field(..., ge=1, le=3)
    priority:    int = Field(..., ge=1, le=20)
    warnings:    list[str] = Field(default=[], max_length=10)
    brand_tips:  list[str] = Field(default=[], max_length=10)

    @field_validator("price_max")
    @classmethod
    def price_max_at_least_price_min(cls, v: float, info) -> float:
        price_min = info.data.get("price_min")
        if price_min is not None and v < price_min:
            raise ValueError(f"price_max ({v}) must be >= price_min ({price_min})")
        return v


class ModRecommendationsResponse(BaseModel):
    """Wrapper required because tool input_schema must be a JSON object at the
    root — a bare JSON array isn't a valid top-level tool input shape."""
    model_config = ConfigDict(extra="forbid")

    recommendations: list[ModRecommendation] = Field(..., min_length=4, max_length=12)


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
    mods:               list[ModRecommendation]
    total_min:          float
    total_max:          float
    budget_remaining:   float
    budget_warning:     Optional[str] = None
    summary:            str
    stage_breakdown:    dict[str, list[str]]   # {"Stage 1": ["mod name", ...]}
    used_mock_fallback: bool = False
