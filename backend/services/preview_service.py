# services/preview_service.py
# Anonymous planner: generates a full plan for a vehicle without creating a
# Build row or touching the database. Same AI-then-mock fallback the async
# worker uses, just run inline (one request, no job queue) and never saved.

import asyncio

from pydantic import ValidationError

from models.build import BuildCreate
from models.recommendation import ModPlan, ModRecommendation
from services.ai_service import generate_build_recommendations
from services.mock_ai import build_mod_plan, generate_recommendations as mock_recommendations


def _plan_mods(build: BuildCreate) -> tuple[list[ModRecommendation], bool]:
    ai_mods = generate_build_recommendations(build)
    if ai_mods is not None:
        try:
            return [ModRecommendation(**m) for m in ai_mods], False
        except ValidationError:
            pass
    return mock_recommendations(build), True


async def generate_preview_plan(build: BuildCreate) -> ModPlan:
    mods, used_mock = await asyncio.to_thread(_plan_mods, build)
    plan = build_mod_plan(0, build, mods)
    plan.used_mock_fallback = used_mock
    return plan
