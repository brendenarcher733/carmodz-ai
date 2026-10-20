# routers/plans.py
# Public, unauthenticated plan preview. Nothing is saved — the result only
# lives in the caller's browser. Rate-limited per IP because every call can
# hit the paid AI provider.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core import analytics
from core.database import get_db
from core.rate_limit import RateLimiter
from models.build import BuildCreate
from models.recommendation import ModPlan
from services.preview_service import generate_preview_plan
from services.vehicle_service import VehicleCheckStatus, check_vehicle

router = APIRouter(prefix="/api/plans", tags=["Plans"])

preview_rate_limit = RateLimiter(times=5, seconds=600, scope="plan_preview")


@router.post("/preview", response_model=ModPlan, dependencies=[Depends(preview_rate_limit)])
async def preview_plan(data: BuildCreate, db: Session = Depends(get_db)):
    """Preserves the frictionless anonymous-preview experience: an unknown
    vehicle still gets a plan (marked unverified in the response), only a
    *known-invalid* year/make/model combination is rejected. See
    services/vehicle_service.check_vehicle — the same check authenticated
    build creation runs."""
    check = check_vehicle(db, data.make, data.model, data.year)
    if check.status is VehicleCheckStatus.INVALID_YEAR:
        raise HTTPException(status_code=422, detail=f"{data.make} {data.model}: {check.message}")

    plan = await generate_preview_plan(data, vehicle_verified=check.status is VehicleCheckStatus.VERIFIED)
    analytics.capture("plan_preview_generated")
    return plan
