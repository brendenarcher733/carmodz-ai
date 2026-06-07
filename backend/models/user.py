# models/user.py
# User ORM model + Pydantic auth schemas

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from core.database import Base
from pydantic import BaseModel, Field, field_validator
import re


# ── ORM Model ─────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(200), nullable=False)
    email         = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User id={self.id} {self.email}>"


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name:     str = Field(..., min_length=1, max_length=200)
    email:    str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


class UserLogin(BaseModel):
    email:    str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id:         int
    name:       str
    email:      str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse
