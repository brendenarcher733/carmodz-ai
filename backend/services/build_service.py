# services/build_service.py
# Business logic for build CRUD operations

from sqlalchemy.orm import Session
from models.build import Build, BuildCreate
from models.recommendation import Recommendation, ModRecommendation
from services.mock_ai import generate_recommendations as mock_recommendations, build_mod_plan
from services.ai_service import generate_build_recommendations
from fastapi import HTTPException


def create_build(db: Session, data: BuildCreate, user_id: int) -> Build:
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
    )
    db.add(build)
    db.commit()
    db.refresh(build)

    # Auto-generate recommendations — Claude if key set, mock fallback
    ai_mods = generate_build_recommendations(data)
    if ai_mods is not None:
        mods = [ModRecommendation(**m) for m in ai_mods]
    else:
        mods = mock_recommendations(data)

    for mod in mods:
        rec = Recommendation(
            build_id=build.id,
            name=mod.name,
            category=mod.category,
            description=mod.description,
            price_min=mod.price_min,
            price_max=mod.price_max,
            difficulty=mod.difficulty,
            stage=mod.stage,
            priority=mod.priority,
            warnings=mod.warnings,
            brand_tips=mod.brand_tips,
        )
        db.add(rec)

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
    recs = db.query(Recommendation).filter(Recommendation.build_id == build_id).all()

    from models.recommendation import ModRecommendation
    mods = [
        ModRecommendation(
            name=r.name, category=r.category, description=r.description,
            price_min=r.price_min, price_max=r.price_max,
            difficulty=r.difficulty, stage=r.stage, priority=r.priority,
            warnings=r.warnings or [], brand_tips=r.brand_tips or [],
        )
        for r in recs
    ]

    from models.build import BuildCreate
    build_data = BuildCreate(
        title=build.title, year=build.year, make=build.make, model=build.model,
        budget=build.budget, goal=build.goal, experience=build.experience,
        categories=build.categories or [], is_daily=bool(build.is_daily), notes=build.notes or "",
    )

    return build_mod_plan(build_id, build_data, mods)
