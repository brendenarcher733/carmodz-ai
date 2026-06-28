# routers/builds.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from core.database import get_db
from models.build import BuildCreate, BuildResponse
from models.recommendation import ModPlan
from models.user import User
from routers.auth import get_current_user
from services.build_service import (
    create_build, get_build, get_all_builds, delete_build, get_build_plan,
    toggle_favourite, get_garage_stats,
)
from typing import Optional

router = APIRouter(prefix="/api/builds", tags=["Builds"])


@router.get("/stats")
def garage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats for the current user's garage dashboard."""
    return get_garage_stats(db, current_user.id)


@router.post("/", response_model=BuildResponse, status_code=201)
def create_new_build(
    data: BuildCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new build plan and auto-generate mod recommendations."""
    return create_build(db, data, current_user.id)


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


@router.get("/{build_id}/plan", response_model=ModPlan)
def get_build_plan_route(
    build_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full mod plan for a build including budget breakdown and stage roadmap."""
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
