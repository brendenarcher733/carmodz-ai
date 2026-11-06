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
from models.plan_email import PlanEmailRequest, PlanEmailResponse
from models.recommendation import ModPlan
from services.plan_email_service import send_plan_email
from services.preview_service import generate_preview_plan
from services.vehicle_service import VehicleCheckStatus, check_vehicle

router = APIRouter(prefix="/api/plans", tags=["Plans"])

preview_rate_limit    = RateLimiter(times=5,  seconds=600, scope="plan_preview")
# Sends a real email per call — same abuse guard as every other
# anonymous-reachable endpoint with a real-world cost (routers/guides.py,
# routers/shops.py), tighter than preview's since this one's target is a
# third party's inbox, not just this app's own resources.
email_plan_rate_limit = RateLimiter(times=5, seconds=600, scope="email_plan")


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


@router.post("/email", response_model=PlanEmailResponse, dependencies=[Depends(email_plan_rate_limit)])
def email_plan(data: PlanEmailRequest, db: Session = Depends(get_db)):
    """Lightweight lead capture, not an account — see models/plan_email.py.
    The frontend sends the plan it already has in memory (nothing is
    looked up by ID: an anonymous preview was never assigned one)."""
    capture = send_plan_email(db, data)
    analytics.capture("plan_emailed", {"make": data.plan.make, "model": data.plan.model})
    return PlanEmailResponse(id=capture.id)
