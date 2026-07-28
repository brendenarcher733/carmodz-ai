# tests/test_billing_usage_limits.py
#
# Unit-level tests against services/billing_service.py directly — the single
# source of truth for both enforcement (routers/advisor.py,
# services/build_service.py) and the /usage display, so a bug here would
# affect both.

import datetime

import pytest
from fastapi import HTTPException

from conftest import make_user
from models.build import Build
from models.user import AiRequestLog
from services.billing_service import (
    enforce_build_limit, enforce_chat_limit, get_usage,
    FREE_BUILD_LIMIT, FREE_CHAT_DAILY_LIMIT,
)


def _make_build(db, user_id, title="Test Build"):
    b = Build(user_id=user_id, title=title, year=2020, make="Honda", model="Civic",
              budget=1000, goal="street performance", experience="intermediate")
    db.add(b)
    db.commit()
    return b


def _make_chat_log(db, user_id, created_at=None):
    log = AiRequestLog(
        user_id=user_id, request_type="chat", provider="mock", success=True,
        created_at=created_at or datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()


def test_free_tier_build_limit_blocks_second_build(db):
    user = make_user(db, email="limit1@example.com", plan="free")
    _make_build(db, user.id)
    with pytest.raises(HTTPException) as exc:
        enforce_build_limit(db, user)
    assert exc.value.status_code == 403


def test_free_tier_build_limit_allows_first_build(db):
    user = make_user(db, email="limit2@example.com", plan="free")
    enforce_build_limit(db, user)  # no builds yet — should not raise


def test_pro_tier_bypasses_build_limit(db):
    user = make_user(db, email="limit3@example.com", plan="pro")
    for _ in range(FREE_BUILD_LIMIT + 3):
        _make_build(db, user.id)
    enforce_build_limit(db, user)  # should not raise regardless of count


def test_free_tier_chat_limit_blocks_at_threshold(db):
    user = make_user(db, email="limit4@example.com", plan="free")
    for _ in range(FREE_CHAT_DAILY_LIMIT):
        _make_chat_log(db, user.id)
    with pytest.raises(HTTPException) as exc:
        enforce_chat_limit(db, user.id)
    assert exc.value.status_code == 403


def test_free_tier_chat_limit_allows_under_threshold(db):
    user = make_user(db, email="limit5@example.com", plan="free")
    for _ in range(FREE_CHAT_DAILY_LIMIT - 1):
        _make_chat_log(db, user.id)
    enforce_chat_limit(db, user.id)  # should not raise


def test_chat_limit_resets_on_new_utc_day(db):
    user = make_user(db, email="limit6@example.com", plan="free")
    yesterday = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    for _ in range(FREE_CHAT_DAILY_LIMIT + 5):
        _make_chat_log(db, user.id, created_at=yesterday)
    enforce_chat_limit(db, user.id)  # all usage was yesterday — today is fresh


def test_chat_limit_anonymous_user_is_noop(db):
    enforce_chat_limit(db, None)  # must never raise, regardless of any user's usage


def test_pro_tier_bypasses_chat_limit(db):
    user = make_user(db, email="limit7@example.com", plan="pro")
    for _ in range(FREE_CHAT_DAILY_LIMIT + 10):
        _make_chat_log(db, user.id)
    enforce_chat_limit(db, user.id)  # should not raise


def test_get_usage_free_plan_shape(db):
    user = make_user(db, email="limit8@example.com", plan="free")
    _make_build(db, user.id)
    _make_chat_log(db, user.id)

    usage = get_usage(db, user)
    assert usage["plan"] == "free"
    assert usage["builds_used"] == 1
    assert usage["builds_limit"] == FREE_BUILD_LIMIT
    assert usage["chat_messages_used_today"] == 1
    assert usage["chat_messages_limit"] == FREE_CHAT_DAILY_LIMIT


def test_get_usage_pro_plan_has_no_limits(db):
    user = make_user(db, email="limit9@example.com", plan="pro")
    usage = get_usage(db, user)
    assert usage["builds_limit"] is None
    assert usage["chat_messages_limit"] is None
