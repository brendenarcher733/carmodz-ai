# models/build.py
# SQLAlchemy ORM model + Pydantic schemas for Build

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from pydantic import BaseModel, Field
from typing import Optional


# ── ORM Model ─────────────────────────────────────────────────────────────────

class Build(Base):
    __tablename__ = "builds"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title         = Column(String(200), nullable=False)
    year          = Column(Integer, nullable=False)
    make          = Column(String(100), nullable=False)
    model         = Column(String(100), nullable=False)
    budget        = Column(Float, nullable=False)
    goal          = Column(String(200), nullable=False)
    experience    = Column(String(50), nullable=False)   # beginner|intermediate|advanced
    categories    = Column(JSON, default=list)           # ["performance", "sound", ...]
    is_daily      = Column(Integer, default=1)           # 1=daily, 0=project car
    is_favourite  = Column(Boolean, default=False)
    notes         = Column(Text, default="")
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Async recommendation-generation job tracking. status_updated_at is set
    # explicitly by application code every time `status` changes — it
    # deliberately does NOT use SQLAlchemy's onupdate=, which would bump it
    # on *any* row update (e.g. toggling is_favourite) and corrupt the cron
    # reaper's "how long has this actually been stuck in generating" check.
    status            = Column(String(20), default="pending")  # pending|generating|ready|failed
    job_id            = Column(String(64), nullable=True)
    used_mock_fallback = Column(Boolean, default=False)
    error_message     = Column(Text, nullable=True)
    status_updated_at = Column(DateTime, default=datetime.utcnow)

    # One build → many recommendations
    recommendations = relationship("Recommendation", back_populates="build",
                                   cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Build id={self.id} {self.year} {self.make} {self.model}>"


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class BuildCreate(BaseModel):
    title:      str        = Field(..., min_length=1, max_length=200)
    year:       int        = Field(..., ge=1950, le=2026)
    make:       str        = Field(..., min_length=1, max_length=100)
    model:      str        = Field(..., min_length=1, max_length=100)
    budget:     float      = Field(..., gt=0, le=10_000_000)
    goal:       str        = Field(..., min_length=1, max_length=200)
    experience: str        = Field(..., pattern="^(beginner|intermediate|advanced)$")
    categories: list[str]  = Field(default=[], max_length=10)
    is_daily:   bool       = Field(default=True)
    notes:      str        = Field(default="", max_length=2000)

    class Config:
        json_schema_extra = {
            "example": {
                "title":      "JDM Street Build",
                "year":       2020,
                "make":       "Toyota",
                "model":      "Supra",
                "budget":     8000,
                "goal":       "street performance",
                "experience": "intermediate",
                "categories": ["performance", "sound", "handling"],
                "is_daily":   False,
                "notes":      "Want to hit 400whp eventually"
            }
        }


class BuildResponse(BaseModel):
    id:           int
    title:        str
    year:         int
    make:         str
    model:        str
    budget:       float
    goal:         str
    experience:   str
    categories:   list[str]
    is_daily:     bool
    is_favourite: bool = False
    notes:        str
    created_at:   datetime
    updated_at:   datetime

    # Job tracking — lets the frontend know whether recommendations are ready
    # to fetch yet, and whether they came from the real AI or the mock
    # fallback (used_mock_fallback exists so a degraded result is disclosed,
    # never silently passed off as a normal AI-generated plan).
    status:             str = "ready"
    job_id:             Optional[str] = None
    used_mock_fallback: bool = False
    error_message:      Optional[str] = None

    class Config:
        from_attributes = True


class BuildStatusResponse(BaseModel):
    """Lightweight payload for polling — avoids shipping the full build
    (categories, notes, etc.) on every 1.5s poll tick."""
    id:                 int
    status:             str
    job_id:             Optional[str] = None
    used_mock_fallback: bool = False
    error_message:      Optional[str] = None

    class Config:
        from_attributes = True
