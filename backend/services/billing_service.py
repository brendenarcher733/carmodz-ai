# services/billing_service.py
# Free/Pro tier limits and usage — the only place either cap is defined, so
# enforcement (routers/advisor.py, services/build_service.py) and display
# (routers/billing.py's /usage endpoint, feeding pages/Billing.jsx) can't
# drift out of sync with each other.

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.build import Build
from models.user import AiRequestLog, User

# Real production usage was checked before picking this number (see the
# billing plan) — every ai_request_logs row on record is this session's own
# test traffic, busiest single user-day is 2 messages. There's no real
# distribution yet to size a cap from, so this is a reasoned default (roughly
# one build's worth of back-and-forth advisory questions in a sitting) rather
# than a data-backed one. Cheap to revisit once real users exist — the admin
# dashboard and PostHog already in place will show the actual shape of usage.
FREE_BUILD_LIMIT = 1
FREE_CHAT_DAILY_LIMIT = 15


def _is_pro(user: User) -> bool:
    return user.plan == "pro"


def _today_utc_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)


def _build_count(db: Session, user_id: int) -> int:
    return db.query(func.count(Build.id)).filter(Build.user_id == user_id).scalar() or 0


def _chat_count_today(db: Session, user_id: int) -> int:
    return (
        db.query(func.count(AiRequestLog.id))
        .filter(
            AiRequestLog.user_id == user_id,
            AiRequestLog.request_type == "chat",
            AiRequestLog.created_at >= _today_utc_start(),
        )
        .scalar() or 0
    )


def get_usage(db: Session, user: User) -> dict:
    """Powers both enforcement below and the /billing page's usage display —
    one source of truth for what's used vs. what's allowed."""
    pro = _is_pro(user)
    return {
        "plan": user.plan,
        "builds_used": _build_count(db, user.id),
        "builds_limit": None if pro else FREE_BUILD_LIMIT,
        "chat_messages_used_today": _chat_count_today(db, user.id),
        "chat_messages_limit": None if pro else FREE_CHAT_DAILY_LIMIT,
        "subscription_cancel_at": user.subscription_cancel_at,
    }


def enforce_build_limit(db: Session, user: User) -> None:
    if _is_pro(user):
        return
    if _build_count(db, user.id) >= FREE_BUILD_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"Free plan is limited to {FREE_BUILD_LIMIT} saved build. Upgrade to Pro for unlimited builds.",
        )


def enforce_chat_limit(db: Session, user_id: int | None) -> None:
    """No-op for anonymous callers (user_id is None) — the Mod Advisor chat
    stays usable while logged out exactly as it was before billing existed;
    this only gates authenticated free-plan usage."""
    if user_id is None:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or _is_pro(user):
        return
    if _chat_count_today(db, user_id) >= FREE_CHAT_DAILY_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"Free plan is limited to {FREE_CHAT_DAILY_LIMIT} advisor messages per day. Upgrade to Pro for unlimited chat.",
        )
