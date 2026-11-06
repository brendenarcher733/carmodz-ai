# models/vehicle_waitlist.py
# "My vehicle isn't listed" waitlist — Planner.jsx's VehicleSelector used
# to let this path fall through to real plan generation for an unverified,
# free-text vehicle (vehicle_verified=False). It no longer does: a vehicle
# outside the catalog now dead-ends here instead, capturing interest
# rather than generating a plan for something we don't actually support.
# No account, no plan, no AI call — just the email and what they typed.

import re
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from core.database import Base

# Same format/normalization as models.user.UserCreate.validate_email and
# models.plan_email.PlanEmailRequest — reused verbatim rather than a third
# copy of the same regex.
_EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class VehicleWaitlistCapture(Base):
    __tablename__ = "vehicle_waitlist_requests"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), nullable=False, index=True)
    make       = Column(String(100), nullable=False)
    model      = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VehicleWaitlistRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., min_length=3, max_length=255)
    make:  str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=150)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(_EMAIL_RE, v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("make", "model")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class VehicleWaitlistResponse(BaseModel):
    id: int
