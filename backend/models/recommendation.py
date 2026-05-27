# models/recommendation.py
# Mod recommendations linked to a build

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from core.database import Base
from pydantic import BaseModel, Field
from typing import Optional


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


class ModRecommendation(BaseModel):
    name:        str
    category:    str
    description: str
    price_min:   float
    price_max:   float
    difficulty:  str
    stage:       int
    priority:    int
    warnings:    list[str] = []
    brand_tips:  list[str] = []


class RecommendationResponse(ModRecommendation):
    id:         int
    build_id:   int
    created_at: datetime

    class Config:
        from_attributes = True


class ModPlan(BaseModel):
    """Full plan returned by the recommendation engine."""
    build_id:           int
    mods:               list[ModRecommendation]
    total_min:          float
    total_max:          float
    budget_remaining:   float
    budget_warning:     Optional[str] = None
    summary:            str
    stage_breakdown:    dict[str, list[str]]   # {"Stage 1": ["mod name", ...]}
