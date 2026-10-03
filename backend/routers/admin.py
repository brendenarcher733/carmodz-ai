# routers/admin.py
# Internal admin dashboard — read-only today (no suspend/reactivate actions
# yet; see services/admin_service.py). Every route is behind require_admin.

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from models.user import User
from routers.auth import require_admin
from services.admin_service import get_platform_stats, get_popular_vehicles, get_users_with_stats
from services.posthog_query_service import get_traffic_summary

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    email_verified: bool
    is_admin: bool
    created_at: datetime
    last_login_at: datetime | None
    ai_request_count: int
    build_count: int


class AdminUsersResponse(BaseModel):
    users: list[AdminUserOut]
    total: int


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_builds: int
    total_ai_requests: int
    new_users_this_week: int
    avg_ai_response_time_ms: int | None = None


class PopularVehicle(BaseModel):
    make: str
    model: str
    count: int


class TrafficDay(BaseModel):
    day: str
    pageviews: int
    visitors: int


class TrafficTotals(BaseModel):
    pageviews: int
    visitors: int


class TopPage(BaseModel):
    path: str
    views: int


class TrafficResponse(BaseModel):
    configured: bool
    days: int | None = None
    totals: TrafficTotals | None = None
    daily: list[TrafficDay] = []
    top_pages: list[TopPage] = []


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(db: Session = Depends(get_db)):
    return get_platform_stats(db)


@router.get("/popular-vehicles", response_model=list[PopularVehicle])
def admin_popular_vehicles(db: Session = Depends(get_db)):
    return get_popular_vehicles(db)


@router.get("/users", response_model=AdminUsersResponse)
def admin_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    search: str = Query(default=""),
    db: Session = Depends(get_db),
):
    users, total = get_users_with_stats(db, skip=skip, limit=limit, search=search)
    return {"users": users, "total": total}


@router.get("/analytics/traffic", response_model=TrafficResponse)
def admin_traffic(days: int = Query(default=30, ge=1, le=90)):
    try:
        return get_traffic_summary(days)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
