# models/plan_email.py
# "Email me this plan" — a lightweight lead-capture, not an account. The
# anonymous preview flow (services/preview_service.py) never persists a
# plan at all (ModPlan.build_id is always 0 there), so there's no existing
# plan row to attach an email to. This table is the plan's only record:
# its own id IS "the plan ID" from this feature's perspective, and
# plan_snapshot is the full plan so the email content (and any future
# reference back to it) is self-contained rather than pointing at data
# that was never saved anywhere else.

import re
from datetime import datetime

from sqlalchemy import Column, Integer, String, JSON, DateTime
from pydantic import BaseModel, Field, field_validator

from core.database import Base
from models.recommendation import ModPlan


class PlanEmailCapture(Base):
    __tablename__ = "plan_email_captures"

    id             = Column(Integer, primary_key=True, index=True)
    email          = Column(String(255), nullable=False, index=True)
    year           = Column(Integer, nullable=False)
    make           = Column(String(100), nullable=False)
    model          = Column(String(150), nullable=False)
    # Full ModPlan payload at send time — not just a few fields, so the
    # email body can be rebuilt or re-sent later without needing the
    # frontend's in-memory plan (which, again, lives nowhere else).
    plan_snapshot  = Column(JSON, nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)


# Same email format/normalization as models.user.UserCreate.validate_email
# — reused verbatim rather than adding pydantic's EmailStr (a new
# dependency, email-validator, this project doesn't already have).
_EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class PlanEmailRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    # The frontend already holds the full plan in memory (it's never
    # persisted for an anonymous preview) — sent as-is rather than
    # re-fetched from somewhere that doesn't have it.
    plan: ModPlan

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(_EMAIL_RE, v):
            raise ValueError("Invalid email address")
        return v


class PlanEmailResponse(BaseModel):
    id: int
