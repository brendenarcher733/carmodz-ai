# routers/advisor.py
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from core.database import get_db, SessionLocal
from core.rate_limit import RateLimiter
from models.schemas import ChatMessageIn
from services.chat_service import handle_chat, handle_chat_stream

router = APIRouter(prefix="/api/mod-advisor", tags=["Mod Advisor"])

# Public, unauthenticated endpoint that can call paid AI APIs — throttle hard.
chat_rate_limit = RateLimiter(times=20, seconds=60, scope="advisor-chat")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1)
    vehicle: Optional[dict] = None
    build_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[list[str]] = None


def _suggestions_for(message: str, response: str) -> Optional[list[str]]:
    """Generate follow-up suggestion chips based on message + response content."""
    combined = (message + " " + response).lower()
    if any(w in combined for w in ["turbo", "boost", "intercooler", "forced induction"]):
        return ["What supporting mods do I need?", "How much power can I expect?", "What tune do I need after?"]
    if any(w in combined for w in ["exhaust", "muffler", "axle-back", "cat-back"]):
        return ["Will it drone on the highway?", "Cat-back vs axle-back?", "Best exhaust brands?"]
    if any(w in combined for w in ["suspension", "coilover", "spring", "handling"]):
        return ["Do I need an alignment after?", "Coilovers vs lowering springs?", "What about sway bars?"]
    if any(w in combined for w in ["performance", "power", "intake", "tune", "ecu"]):
        return ["What should I do first?", "Is a tune worth it?", "What's the best bang for buck?"]
    if any(w in combined for w in ["track", "autocross", "circuit", "race"]):
        return ["What safety gear do I need?", "Brake upgrade recommendations?", "What tires for track days?"]
    return None


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(chat_rate_limit)])
def chat_with_advisor(payload: ChatRequest, db: Session = Depends(get_db)):
    data = ChatMessageIn(
        session_id=payload.session_id,
        message=payload.message,
        build_id=payload.build_id,
        vehicle=payload.vehicle,
    )
    reply = handle_chat(db, data)
    return ChatResponse(
        response=reply,
        suggestions=_suggestions_for(payload.message, reply),
    )


@router.post("/chat/stream", dependencies=[Depends(chat_rate_limit)])
async def chat_with_advisor_stream(payload: ChatRequest):
    """SSE variant of /chat — same rate limit, same persistence, same
    suggestion-chip logic, but yields text as it's generated instead of
    waiting for the full response. Manages its own DB session (rather than
    Depends(get_db)) so its lifetime is unambiguous across the whole
    streamed response regardless of how the ASGI server times dependency
    teardown relative to StreamingResponse body consumption — same pattern
    the arq worker already uses for its own DB session."""
    data = ChatMessageIn(
        session_id=payload.session_id,
        message=payload.message,
        build_id=payload.build_id,
        vehicle=payload.vehicle,
    )

    async def event_stream():
        db = SessionLocal()
        full_text = ""
        try:
            async for chunk in handle_chat_stream(db, data):
                full_text += chunk
                yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"
        finally:
            db.close()

        suggestions = _suggestions_for(payload.message, full_text)
        yield f"data: {json.dumps({'type': 'done', 'suggestions': suggestions})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
