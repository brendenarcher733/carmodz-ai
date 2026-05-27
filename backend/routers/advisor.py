# routers/advisor.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.mock_ai import generate_chat_response, generate_recommendations
from models.build import BuildCreate

router = APIRouter(prefix="/api/mod-advisor", tags=["Mod Advisor"])


class ChatMessage(BaseModel):
    message: str
    build_context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[list[str]] = None


class QuickRecsRequest(BaseModel):
    year: int
    make: str
    model: str
    budget: float
    goal: str
    experience: str
    categories: list[str] = []
    is_daily: bool = True


@router.post("/chat", response_model=ChatResponse)
def chat_with_advisor(payload: ChatMessage):
    """
    Mod Advisor chatbot endpoint.
    Swap generate_chat_response() for an OpenAI call when ready.
    """
    response = generate_chat_response(payload.message, payload.build_context)

    # Surface quick suggestions based on message content
    suggestions = None
    msg = payload.message.lower()
    if any(w in msg for w in ["performance", "power", "fast"]):
        suggestions = ["Tell me about intakes", "Best exhaust mods?", "Should I tune first?"]
    elif any(w in msg for w in ["handling", "suspension", "corner"]):
        suggestions = ["Coilovers vs springs?", "What about sway bars?", "Do I need alignment after?"]
    elif any(w in msg for w in ["sound", "exhaust", "loud"]):
        suggestions = ["Axle-back vs cat-back?", "Will it drone on the highway?", "Best exhaust brands?"]

    return ChatResponse(response=response, suggestions=suggestions)


@router.post("/quick-recs")
def quick_recommendations(payload: QuickRecsRequest):
    """
    Generate instant recommendations without saving to DB.
    Used for the advisor preview before committing to a full build.
    """
    build = BuildCreate(
        title="Preview",
        year=payload.year,
        make=payload.make,
        model=payload.model,
        budget=payload.budget,
        goal=payload.goal,
        experience=payload.experience,
        categories=payload.categories,
        is_daily=payload.is_daily,
        notes="",
    )
    mods = generate_recommendations(build)
    return {
        "mods": [m.model_dump() for m in mods[:5]],
        "count": len(mods),
    }
