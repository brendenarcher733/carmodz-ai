# routers/admin.py
# Internal admin dashboard — read-only today (no suspend/reactivate actions
# yet; see services/admin_service.py). Every route is behind require_admin.

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from models.user import User
from routers.auth import require_admin
from services.admin_service import get_platform_stats, get_popular_vehicles, get_users_with_stats

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
