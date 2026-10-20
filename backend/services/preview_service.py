# services/preview_service.py
# Anonymous planner: generates a full plan for a vehicle without creating a
# Build row or touching the database. Same AI-then-mock fallback the async
# worker uses, just run inline (one request, no job queue) and never saved.

import asyncio
import uuid

from pydantic import ValidationError

from models.build import BuildCreate
from models.recommendation import EvaluatedModRecommendation, ModPlan
from services.ai_service import generate_build_recommendations
from services.mock_ai import build_mod_plan, generate_recommendations as mock_recommendations


def _plan_mods(build: BuildCreate, vehicle_verified: bool) -> tuple[list[EvaluatedModRecommendation], bool]:
    ai_mods = generate_build_recommendations(
        build,
        session_id=f"preview-{uuid.uuid4()}",
        trace_id=str(uuid.uuid4()),
        vehicle_verified=vehicle_verified,
    )
    if ai_mods is not None:
        try:
            return [EvaluatedModRecommendation(**m) for m in ai_mods], False
        except ValidationError:
            pass
    return mock_recommendations(build, vehicle_verified=vehicle_verified), True


async def generate_preview_plan(build: BuildCreate, *, vehicle_verified: bool = False) -> ModPlan:
    """vehicle_verified is decided by the caller (routers/plans.py), which
    already ran services/vehicle_service.check_vehicle before calling this —
    this function has no DB access of its own. Known-invalid year/make/model
    combinations never reach here at all; the router rejects those first."""
    mods, used_mock = await asyncio.to_thread(_plan_mods, build, vehicle_verified)
    plan = build_mod_plan(0, build, mods, vehicle_verified=vehicle_verified)
    plan.used_mock_fallback = used_mock
    return plan
