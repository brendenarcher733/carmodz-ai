# models/user.py
# User ORM model + Pydantic auth schemas

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from pydantic import BaseModel, Field, field_validator
import re


# ── ORM Models ────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(200), nullable=False)
    email          = Column(String(255), nullable=False, unique=True, index=True)
    password_hash  = Column(String(255), nullable=False)
    is_active      = Column(Boolean, default=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at     = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User id={self.id} {self.email}>"


class RefreshToken(Base):
    """A long-lived session token, delivered to the client as an httpOnly
    cookie (see core/security.py + routers/auth.py). Only its hash is ever
    stored — same discipline as password_hash. Rotated on every use; a
    presented-but-already-revoked token is treated as a signal of theft
    (see routers/auth.py's /refresh handler)."""
    __tablename__ = "refresh_tokens"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash       = Column(String(64), nullable=False, unique=True, index=True)
    csrf_token_hash  = Column(String(64), nullable=False)
    user_agent       = Column(String(500), nullable=True)
    expires_at       = Column(DateTime, nullable=False)
    revoked_at       = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    last_used_at     = Column(DateTime, nullable=True)

    user = relationship("User")


class ActionToken(Base):
    """Single-use, time-limited tokens for email verification and password
    reset — same "store only the hash" discipline as RefreshToken. One
    table, purpose-discriminated, since both are identical in lifecycle
    (issue -> emailed to the user -> consumed once -> expire if unused)."""
    __tablename__ = "action_tokens"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash  = Column(String(64), nullable=False, unique=True, index=True)
    purpose     = Column(String(30), nullable=False)  # "verify_email" | "reset_password"
    expires_at  = Column(DateTime, nullable=False)
    used_at     = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


# ── Pydantic Schemas ───────────────────────────────────────────────────────────

def validate_password_strength(v: str) -> str:
    """Shared by signup and password-reset so the two can't drift apart.
    Length (8+, already enforced by the Field constraint on each schema)
    plus a cheap block on the most trivial patterns. Deliberately not full
    breach-list/complexity-rule checking (e.g. HaveIBeenPwned) — that needs
    an external dataset/API and is a reasonable future addition, not
    something to half-implement here."""
    if v.isdigit():
        raise ValueError("Password can't be all numbers")
    if len(set(v)) == 1:
        raise ValueError("Password can't be a single repeated character")
    return v


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

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserLogin(BaseModel):
    email:    str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id:             int
    name:           str
    email:          str
    email_verified: bool
    created_at:     datetime

    model_config = {"from_attributes": True}


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class ResetPasswordRequest(BaseModel):
    token:        str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return validate_password_strength(v)


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=1)


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    # Not a secret on its own — its job is proving a request came from JS
    # that legitimately received this response, not protecting itself from
    # theft. The refresh token (the thing actually worth protecting) never
    # appears in a JSON body at all; it's set as an httpOnly cookie.
    csrf_token:   str
    user:         UserResponse
