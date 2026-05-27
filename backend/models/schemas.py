"""
models/schemas.py
Pydantic v2 schemas for API request validation and response serialisation.
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Shared types ──────────────────────────────────────────────────────────────

BuildGoal = Literal[
    "daily_driver",
    "performance",
    "track_focused",
    "street_style",
    "budget_build",
    "reliability",
    "cosmetic",
    "sound",
    "beginner_friendly",
]

ExperienceLevel = Literal["beginner", "intermediate", "expert"]
UsageType = Literal["daily", "project"]
CategoryType = Literal[
    "performance", "sound", "cosmetic",
    "handling", "reliability", "interior",
]
DifficultyLevel = Literal["beginner", "intermediate", "advanced"]


# ── Recommendation schemas ─────────────────────────────────────────────────────

class RecommendationOut(BaseModel):
    id:          int
    name:        str
    category:    str
    description: str
    price_low:   float
    price_high:  float
    difficulty:  str
    priority:    int
    stage:       int
    warning:     Optional[str] = None
    notes:       Optional[str] = None

    model_config = {"from_attributes": True}


# ── Build schemas ──────────────────────────────────────────────────────────────

class BuildCreate(BaseModel):
    title:      str = Field(..., min_length=1, max_length=200)
    year:       int = Field(..., ge=1970, le=2026)
    make:       str = Field(..., min_length=1, max_length=100)
    model:      str = Field(..., min_length=1, max_length=100)
    budget:     float = Field(..., gt=0)
    build_goal: BuildGoal
    experience: ExperienceLevel
    usage:      UsageType
    categories: list[CategoryType] = Field(..., min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "EK Civic Weekend Build",
                "year": 1999,
                "make": "Honda",
                "model": "Civic",
                "budget": 3000,
                "build_goal": "performance",
                "experience": "intermediate",
                "usage": "project",
                "categories": ["performance", "handling", "sound"],
            }
        }
    }


class BuildOut(BaseModel):
    id:             int
    title:          str
    year:           int
    make:           str
    model:          str
    budget:         float
    build_goal:     str
    experience:     str
    usage:          str
    categories:     list[str]
    is_favourite:   bool
    created_at:     datetime
    recommendations: list[RecommendationOut] = []

    model_config = {"from_attributes": True}


class BuildSummary(BaseModel):
    """Lightweight build list item — no recommendations."""
    id:           int
    title:        str
    year:         int
    make:         str
    model:        str
    budget:       float
    build_goal:   str
    is_favourite: bool
    created_at:   datetime
    mod_count:    int = 0

    model_config = {"from_attributes": True}


# ── Chat / Mod Advisor schemas ─────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    session_id: str = Field(..., min_length=1)
    message:    str = Field(..., min_length=1, max_length=2000)
    build_id:   Optional[int] = None
    # Optional vehicle context for smarter responses
    vehicle:    Optional[dict] = None


class ChatMessageOut(BaseModel):
    role:       str
    content:    str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    reply:      str
    session_id: str


# ── Recommendations request ────────────────────────────────────────────────────

class RecommendationRequest(BaseModel):
    year:       int
    make:       str
    model:      str
    budget:     float
    build_goal: BuildGoal
    experience: ExperienceLevel
    usage:      UsageType
    categories: list[CategoryType]
