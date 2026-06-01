"""
services/chat_service.py
Manages chat session history and delegates to the AI service.
"""

from sqlalchemy.orm import Session
from models.chat import ChatMessage
from models.schemas import ChatMessageIn
from services.ai_service import generate_chat_response


def get_session_history(db: Session, session_id: str) -> list[dict]:
    """Load the last 20 messages for a session."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


def save_message(
    db: Session,
    session_id: str,
    role: str,
    content: str,
    build_id: int | None = None,
) -> ChatMessage:
    """Persist a chat message."""
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        build_id=build_id,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def handle_chat(db: Session, data: ChatMessageIn) -> str:
    """
    Full chat cycle:
      1. Load session history
      2. Save the incoming user message
      3. Generate AI response
      4. Save the AI response
      5. Return the reply text
    """
    history = get_session_history(db, data.session_id)

    # Save user message
    save_message(
        db,
        session_id=data.session_id,
        role="user",
        content=data.message,
        build_id=data.build_id,
    )

    # Generate response
    reply = generate_chat_response(
        message=data.message,
        session_history=history,
        vehicle=data.vehicle,
    )

    # Save assistant response
    save_message(
        db,
        session_id=data.session_id,
        role="assistant",
        content=reply,
        build_id=data.build_id,
    )

    return reply
