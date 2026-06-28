# services/build_service.py
# Business logic for build CRUD operations

import logging

from sqlalchemy.orm import Session
from models.build import Build, BuildCreate
from models.recommendation import Recommendation, ModRecommendation
from services.mock_ai import build_mod_plan
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def create_build(db: Session, data: BuildCreate, user_id: int) -> Build:
    """Creates the build row only. Recommendation generation is no longer
    inline here — it used to block this call for 25-45s on a Claude
    round-trip. The router enqueues the async job (workers/recommendation_worker.py)
    right after this returns and stores the resulting job_id on the build."""
    build = Build(
        user_id=user_id,
        title=data.title,
        year=data.year,
        make=data.make,
        model=data.model,
        budget=data.budget,
        goal=data.goal,
        experience=data.experience,
        categories=data.categories,
        is_daily=int(data.is_daily),
        notes=data.notes,
        status="pending",
    )
    db.add(build)
    db.commit()
    db.refresh(build)
    return build


def retry_build_generation(db: Session, build_id: int, user_id: int) -> Build:
    """Resets a failed build back to pending so the router can enqueue a
    fresh job. Only meaningful from status='failed' — retrying a build
    that's already 'ready' (even via mock fallback) would silently throw
    away its existing, valid recommendations for no reason."""
    build = get_build(db, build_id, user_id)
    if build.status not in ("failed",):
        raise HTTPException(
            status_code=409,
            detail=f"Build {build_id} is '{build.status}', not 'failed' — nothing to retry",
        )
    build.status = "pending"
    build.error_message = None
    db.commit()
    db.refresh(build)
    return build


def get_build(db: Session, build_id: int, user_id: int) -> Build:
    build = db.query(Build).filter(Build.id == build_id, Build.user_id == user_id).first()
    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")
    return build


def get_all_builds(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[Build]:
    return (
        db.query(Build)
        .filter(Build.user_id == user_id)
        .order_by(Build.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def toggle_favourite(db: Session, build_id: int, user_id: int) -> Build:
    build = get_build(db, build_id, user_id)
    build.is_favourite = not build.is_favourite
    db.commit()
    db.refresh(build)
    return build


def get_garage_stats(db: Session, user_id: int) -> dict:
    from sqlalchemy import func

    builds = db.query(Build).filter(Build.user_id == user_id).all()
    if not builds:
        return {
            "total_builds": 0, "total_budget": 0, "avg_budget": 0,
            "favourites": 0, "top_make": None, "top_goal": None,
            "total_mods": 0, "avg_mods_per_build": 0,
        }

    total_budget = sum(b.budget for b in builds)
    make_counts: dict[str, int] = {}
    goal_counts: dict[str, int] = {}
    for b in builds:
        make_counts[b.make] = make_counts.get(b.make, 0) + 1
        goal_counts[b.goal] = goal_counts.get(b.goal, 0) + 1

    build_ids = [b.id for b in builds]
    total_mods = (
        db.query(func.count(Recommendation.id))
        .filter(Recommendation.build_id.in_(build_ids))
        .scalar() or 0
    )

    return {
        "total_builds":       len(builds),
        "total_budget":       round(total_budget, 2),
        "avg_budget":         round(total_budget / len(builds), 2),
        "favourites":         sum(1 for b in builds if getattr(b, 'is_favourite', False)),
        "top_make":           max(make_counts, key=make_counts.get),
        "top_goal":           max(goal_counts, key=goal_counts.get),
        "total_mods":         total_mods,
        "avg_mods_per_build": round(total_mods / len(builds), 1),
    }


def delete_build(db: Session, build_id: int, user_id: int) -> None:
    build = get_build(db, build_id, user_id)
    db.delete(build)
    db.commit()


def get_build_plan(db: Session, build_id: int, user_id: int):
    build = get_build(db, build_id, user_id)

    if build.status in ("pending", "generating"):
        # 425 Too Early — the right status code for "this isn't a 404, it's
        # not a 500, the resource is real and just isn't ready yet; the
        # client should retry." That's exactly what the frontend's poller does.
        raise HTTPException(
            status_code=425,
            detail=f"Build {build_id} recommendations are still {build.status} — poll /status and retry",
        )
    if build.status == "failed":
        raise HTTPException(
            status_code=500,
            detail=build.error_message or f"Build {build_id} generation failed",
        )

    recs = db.query(Recommendation).filter(Recommendation.build_id == build_id).all()
    mods = [
        ModRecommendation(
            name=r.name, category=r.category, description=r.description,
            price_min=r.price_min, price_max=r.price_max,
            difficulty=r.difficulty, stage=r.stage, priority=r.priority,
            warnings=r.warnings or [], brand_tips=r.brand_tips or [],
        )
        for r in recs
    ]

    build_data = BuildCreate(
        title=build.title, year=build.year, make=build.make, model=build.model,
        budget=build.budget, goal=build.goal, experience=build.experience,
        categories=build.categories or [], is_daily=bool(build.is_daily), notes=build.notes or "",
    )

    plan = build_mod_plan(build_id, build_data, mods)
    plan.used_mock_fallback = build.used_mock_fallback
    return plan
