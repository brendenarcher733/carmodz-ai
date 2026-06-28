# routers/builds.py
import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from core.database import get_db
from models.build import BuildCreate, BuildResponse, BuildStatusResponse
from models.recommendation import ModPlan
from models.user import User
from routers.auth import get_current_user
from services.build_service import (
    create_build, get_build, get_all_builds, delete_build, get_build_plan,
    toggle_favourite, get_garage_stats, retry_build_generation,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/builds", tags=["Builds"])


async def _enqueue_generation_job(request: Request, db: Session, build) -> None:
    """Enqueue the async recommendation job and persist the resulting arq
    job_id on the build row. Lives in the router, not build_service, because
    it's the one place in this codebase that touches the async Redis pool —
    build_service stays a plain sync module, no event loop assumptions."""
    pool = request.app.state.redis_pool
    job = await pool.enqueue_job("generate_recommendations_task", build.id)
    if job is not None:
        build.job_id = job.job_id
        db.commit()
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
    build = create_build(db, data, current_user.id)
    await _enqueue_generation_job(request, db, build)
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
    await _enqueue_generation_job(request, db, build)
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
    return toggle_favourite(db, build_id, current_user.id)


@router.delete("/{build_id}", status_code=204)
def remove_build(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a build and all its recommendations."""
    delete_build(db, build_id, current_user.id)
