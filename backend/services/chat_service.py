"""
services/chat_service.py
Manages chat session history and delegates to the AI service.
"""

import asyncio
import logging

from sqlalchemy.orm import Session
from core.config import settings
from models.chat import ChatMessage
from models.schemas import ChatMessageIn
from models.user import AiRequestLog
from services.ai_service import generate_chat_response, stream_claude_chat

logger = logging.getLogger(__name__)


def _log_ai_request(db: Session, user_id: int | None, request_type: str) -> None:
    """Logged once per real chat turn, always success=True — chat always
    returns *some* response (falling back to mock on a provider failure is
    silent inside generate_chat_response/stream_claude_chat and doesn't
    propagate a failure signal to this layer today, unlike the build
    recommendation worker, which does track that explicitly — see
    workers/recommendation_worker.py's own logging for the more precise
    success/failure case)."""
    db.add(AiRequestLog(
        user_id=user_id,
        request_type=request_type,
        provider=settings.configured_ai_provider,
        success=True,
    ))
    db.commit()


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


def handle_chat(db: Session, data: ChatMessageIn, user_id: int | None = None) -> str:
    """
    Full chat cycle:
      1. Load session history
      2. Save the incoming user message
      3. Generate AI response
      4. Save the AI response
      5. Return the reply text

    user_id is optional — the Mod Advisor chat endpoint works without being
    logged in (routers/advisor.py); when a session *is* authenticated, the
    request gets attributed to that user for the admin dashboard's usage
    metrics (routers/admin.py).
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
    _log_ai_request(db, user_id, "chat")

    return reply


async def handle_chat_stream(db: Session, data: ChatMessageIn, user_id: int | None = None):
    """Streaming counterpart to handle_chat. Yields text deltas as they
    arrive instead of returning one complete string — doesn't reduce total
    generation time, but collapses *perceived* latency to time-to-first-token
    instead of total-response time, which is most of what "the AI feels slow"
    complaints are actually about for a synchronous chat UI.

    Only the Claude path streams token-by-token today. OpenAI/mock responses
    are already fully generated synchronously by generate_chat_response, so
    they're yielded as a single chunk here rather than faking a stream —
    real per-token OpenAI streaming is a reasonable future addition, not
    required to fix the latency this pass targets (Claude is the configured
    production provider).
    """
    # get_session_history/save_message are sync DB calls. The old sync chat
    # endpoint got automatic thread-pool offloading from FastAPI for free;
    # this async generator doesn't, so these need asyncio.to_thread explicitly
    # to avoid blocking the event loop (and every other concurrent request)
    # for the DB round-trip, however small.
    history = await asyncio.to_thread(get_session_history, db, data.session_id)

    await asyncio.to_thread(
        save_message,
        db,
        session_id=data.session_id,
        role="user",
        content=data.message,
        build_id=data.build_id,
    )

    full_text = ""
    if settings.anthropic_api_key:
        try:
            async for chunk in stream_claude_chat(data.message, history, data.vehicle):
                full_text += chunk
                yield chunk
        except Exception:
            logger.exception("Streaming Claude chat failed, falling back to non-streaming mock")
            # Nothing was yielded yet in the common failure case (connection/
            # auth error before the stream opens) — safe to fall back whole.
            # If it fails mid-stream, full_text already has partial content;
            # continuing from a plain (non-streaming) call would duplicate
            # what the user already saw, so we accept the partial response
            # rather than risk a confusing double-answer.
            if not full_text:
                full_text = await asyncio.to_thread(generate_chat_response, data.message, history, data.vehicle)
                yield full_text
    else:
        full_text = await asyncio.to_thread(generate_chat_response, data.message, history, data.vehicle)
        yield full_text

    await asyncio.to_thread(
        save_message,
        db,
        session_id=data.session_id,
        role="assistant",
        content=full_text,
        build_id=data.build_id,
    )
    await asyncio.to_thread(_log_ai_request, db, user_id, "chat")
