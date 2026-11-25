# routers/builds.py
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core import analytics, posthog_logs
from core.database import get_db
from models.build import BuildCreate, BuildResponse, BuildStatusResponse
from models.recommendation import ModPlan, Recommendation
from models.user import User
from routers.auth import get_current_user
from services.ai_service import generate_stage_transition_message
from services.build_service import (
    create_build, get_build, get_all_builds, delete_build, get_build_plan,
    toggle_favourite, get_garage_stats, retry_build_generation,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/builds", tags=["Builds"])


async def _enqueue_generation_job(request: Request, db: Session, build, plan: str = "free") -> None:
    """Enqueue the async recommendation job and persist the resulting arq
    job_id on the build row. Lives in the router, not build_service, because
    it's the one place in this codebase that touches the async Redis pool —
    build_service stays a plain sync module, no event loop assumptions.

    Pro's "priority queue position" is exactly this: a small artificial
    defer on free-tier jobs, nothing on pro-tier ones, so a pro job enqueued
    in that window gets pulled off the queue first. Deliberately not a real
    priority heap (would mean a second arq queue + worker changes) — this
    gets the same practical effect with a one-line change here, and it's
    the only thing this feature touches in the whole job pipeline. The
    generation logic itself (workers/recommendation_worker.py, services/ai_service.py)
    is completely untouched."""
    pool = request.app.state.redis_pool
    defer_by = None if plan == "pro" else 4
    job = await pool.enqueue_job("generate_recommendations_task", build.id, _defer_by=defer_by)
    if job is not None:
        build.job_id = job.job_id
        db.commit()
        posthog_logs.log_generation_job_enqueued(plan, defer_by or 0)
    else:
        # enqueue_job returns None if a job with the same _job_id already
        # exists and hasn't finished — not expected here since we never pass
        # an explicit _job_id, but worth not pretending it always succeeds.
        logger.error("Failed to enqueue recommendation job for build %s", build.id)


@router.get("/stats")
def garage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats for the current user's garage dashboard."""
    return get_garage_stats(db, current_user.id)


@router.post("/", response_model=BuildResponse, status_code=201)
async def create_new_build(
    data: BuildCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a build and enqueue async recommendation generation.

    Returns immediately (status='pending') — this used to block for 25-45s
    on a Claude round-trip. Poll GET /{id}/status until status='ready'."""
    build = create_build(db, data, current_user)
    analytics.capture("build_created", {
        "year": data.year, "make": data.make, "model": data.model,
        "budget": data.budget, "goal": data.goal, "experience": data.experience,
        "categories": data.categories, "is_daily": data.is_daily,
    })
    await _enqueue_generation_job(request, db, build, plan=current_user.plan)
    return build


@router.get("/", response_model=list[BuildResponse])
def list_builds(
    skip:  int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's saved builds, newest first."""
    return get_all_builds(db, current_user.id, skip=skip, limit=limit)


@router.get("/{build_id}", response_model=BuildResponse)
def get_one_build(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single build by ID — must belong to the current user."""
    return get_build(db, build_id, current_user.id)


@router.get("/{build_id}/status", response_model=BuildStatusResponse)
def get_build_status(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight polling endpoint — the frontend hits this every ~1.5s
    while a build is pending/generating instead of re-fetching the full
    build payload (categories, notes, etc.) on every tick."""
    return get_build(db, build_id, current_user.id)


@router.post("/{build_id}/retry", response_model=BuildResponse)
async def retry_build(
    build_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-enqueue generation for a build stuck in status='failed'."""
    build = retry_build_generation(db, build_id, current_user.id)
    await _enqueue_generation_job(request, db, build, plan=current_user.plan)
    analytics.capture("build_generation_retried")
    return build


@router.get("/{build_id}/plan", response_model=ModPlan)
def get_build_plan_route(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full mod plan for a build including budget breakdown and stage roadmap.

    425 Too Early if generation hasn't finished yet; 500 with the recorded
    error if generation failed and hasn't been retried."""
    return get_build_plan(db, build_id, current_user.id)


@router.patch("/{build_id}/favourite", response_model=BuildResponse)
def toggle_build_favourite(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle the favourite flag on a build."""
    build = toggle_favourite(db, build_id, current_user.id)
    analytics.capture("build_favourite_toggled", {"is_favourite": build.is_favourite})
    return build


class CompleteModRequest(BaseModel):
    completed_by: Optional[str] = None   # "diy" | "shop" | null
    completion_note: Optional[str] = None


@router.patch("/{build_id}/recommendations/{rec_id}/complete")
def complete_recommendation(
    build_id: int,
    rec_id: int,
    body: CompleteModRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single mod as done (DIY or shop), and generate a one-time
    stage-transition message once every mod in that stage is complete."""
    build = get_build(db, build_id, current_user.id)

    rec = db.query(Recommendation).filter(
        Recommendation.id == rec_id,
        Recommendation.build_id == build_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.completed = True
    rec.completed_at = datetime.utcnow()
    rec.completed_by = body.completed_by
    rec.completion_note = body.completion_note
    db.flush()

    stage_recs = db.query(Recommendation).filter(
        Recommendation.build_id == build_id,
        Recommendation.stage == rec.stage
    ).all()

    stage_message = None
    stage_complete = all(r.completed for r in stage_recs)

    if stage_complete:
        next_stage = rec.stage + 1
        next_recs = db.query(Recommendation).filter(
            Recommendation.build_id == build_id,
            Recommendation.stage == next_stage
        ).all()
        existing_messages = build.stage_messages or {}
        if next_recs and not existing_messages.get(str(rec.stage)):
            stage_message = generate_stage_transition_message(
                build, rec.stage, next_recs
            )
            existing_messages[str(rec.stage)] = stage_message
            build.stage_messages = existing_messages

    db.commit()

    return {
        "recommendation": {
            "id": rec.id,
            "completed": rec.completed,
            "completed_at": rec.completed_at,
            "completed_by": rec.completed_by,
            "completion_note": rec.completion_note,
        },
        "stage_complete": stage_complete,
        "stage_message": stage_message,
    }


@router.delete("/{build_id}", status_code=204)
def remove_build(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a build and all its recommendations."""
    delete_build(db, build_id, current_user.id)
    analytics.capture("build_deleted")
