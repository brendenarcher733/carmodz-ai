# routers/plans.py
# Public, unauthenticated plan preview. Nothing is saved — the result only
# lives in the caller's browser. Rate-limited per IP because every call can
# hit the paid AI provider.

from fastapi import APIRouter, Depends

from core.rate_limit import RateLimiter
from models.build import BuildCreate
from models.recommendation import ModPlan
from services.preview_service import generate_preview_plan

router = APIRouter(prefix="/api/plans", tags=["Plans"])

preview_rate_limit = RateLimiter(times=5, seconds=600, scope="plan_preview")


@router.post("/preview", response_model=ModPlan, dependencies=[Depends(preview_rate_limit)])
async def preview_plan(data: BuildCreate):
    return await generate_preview_plan(data)
