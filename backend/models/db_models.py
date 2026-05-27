"""
models/db_models.py
SQLAlchemy ORM table definitions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text,
    DateTime, ForeignKey, JSON, Boolean,
)
from sqlalchemy.orm import relationship
from core.database import Base


class Build(Base):
    """
    Represents a saved car build plan.
    Stores the user's vehicle + preferences and the AI-generated recommendations.
    """
    __tablename__ = "builds"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(200), nullable=False)

    # Vehicle info
    year        = Column(Integer, nullable=False)
    make        = Column(String(100), nullable=False)
    model       = Column(String(100), nullable=False)

    # User preferences
    budget      = Column(Float, nullable=False)
    build_goal  = Column(String(200), nullable=False)
    experience  = Column(String(50), nullable=False)   # beginner | intermediate | expert
    usage       = Column(String(50), nullable=False)   # daily | project
    categories  = Column(JSON, default=list)           # ["performance", "sound", ...]

    # Status
    is_favourite = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    recommendations = relationship(
        "Recommendation", back_populates="build", cascade="all, delete-orphan"
    )
    chat_messages = relationship(
        "ChatMessage", back_populates="build", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Build id={self.id} {self.year} {self.make} {self.model}>"


class Recommendation(Base):
    """
    A single modification recommendation within a build plan.
    """
    __tablename__ = "recommendations"

    id           = Column(Integer, primary_key=True, index=True)
    build_id     = Column(Integer, ForeignKey("builds.id"), nullable=False)

    name         = Column(String(200), nullable=False)
    category     = Column(String(100), nullable=False)   # performance | sound | etc.
    description  = Column(Text, nullable=False)
    price_low    = Column(Float, nullable=False)
    price_high   = Column(Float, nullable=False)
    difficulty   = Column(String(50), nullable=False)    # beginner | intermediate | advanced
    priority     = Column(Integer, default=1)            # 1 = highest
    stage        = Column(Integer, default=1)            # 1 | 2 | 3
    warning      = Column(Text, nullable=True)
    notes        = Column(Text, nullable=True)

    build = relationship("Build", back_populates="recommendations")


class ChatMessage(Base):
    """
    Stores conversation history for the Mod Advisor chatbot per build.
    """
    __tablename__ = "chat_messages"

    id         = Column(Integer, primary_key=True, index=True)
    build_id   = Column(Integer, ForeignKey("builds.id"), nullable=True)
    session_id = Column(String(100), nullable=False, index=True)

    role       = Column(String(20), nullable=False)   # user | assistant
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    build = relationship("Build", back_populates="chat_messages")
