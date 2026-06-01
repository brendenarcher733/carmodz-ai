# routers/advisor.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from core.database import get_db
from models.schemas import ChatMessageIn
from services.chat_service import handle_chat

router = APIRouter(prefix="/api/mod-advisor", tags=["Mod Advisor"])


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


@router.post("/chat", response_model=ChatResponse)
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
