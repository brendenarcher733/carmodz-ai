# models/chat.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    build_id   = Column(Integer, ForeignKey("builds.id"), nullable=True)
    role       = Column(String(20), nullable=False)   # user | assistant
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
