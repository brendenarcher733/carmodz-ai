# services/admin_service.py
# Read-only data layer for the internal admin dashboard (routers/admin.py).

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.build import Build
from models.user import AiRequestLog, User


def get_users_with_stats(
    db: Session, skip: int = 0, limit: int = 50, search: str = ""
) -> tuple[list[dict], int]:
    """One query with LEFT JOINs + GROUP BY for the per-user AI request count
    and build count, instead of N+1 queries per row. Returns (rows, total_count)
    so the router can paginate without a second round-trip for the total."""
    base = db.query(User)
    if search:
        like = f"%{search.strip().lower()}%"
        base = base.filter(
            func.lower(User.email).like(like) | func.lower(User.name).like(like)
        )

    total = base.count()

    rows = (
        base.outerjoin(AiRequestLog, AiRequestLog.user_id == User.id)
        .outerjoin(Build, Build.user_id == User.id)
        .add_columns(
            func.count(func.distinct(AiRequestLog.id)).label("ai_request_count"),
            func.count(func.distinct(Build.id)).label("build_count"),
        )
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    users = [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_active": user.is_active,
            "email_verified": user.email_verified,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "ai_request_count": ai_request_count,
            "build_count": build_count,
        }
        for user, ai_request_count, build_count in rows
    ]
    return users, total


def get_platform_stats(db: Session) -> dict:
    """Flat, easily-extended dict of platform-level counters — new metrics
    are additional keys here, not a schema change."""
    week_ago = datetime.utcnow() - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_builds = db.query(func.count(Build.id)).scalar() or 0
    total_ai_requests = db.query(func.count(AiRequestLog.id)).scalar() or 0
    new_users_this_week = (
        db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
    )
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_builds": total_builds,
        "total_ai_requests": total_ai_requests,
        "new_users_this_week": new_users_this_week,
    }
