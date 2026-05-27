# services/build_service.py
# Business logic for build CRUD operations

from sqlalchemy.orm import Session
from models.build import Build, BuildCreate
from models.recommendation import Recommendation
from services.mock_ai import generate_recommendations, build_mod_plan
from fastapi import HTTPException


def create_build(db: Session, data: BuildCreate) -> Build:
    build = Build(
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

    # Auto-generate recommendations on build creation
    mods = generate_recommendations(data)
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


def get_build(db: Session, build_id: int) -> Build:
    build = db.query(Build).filter(Build.id == build_id).first()
    if not build:
        raise HTTPException(status_code=404, detail=f"Build {build_id} not found")
    return build


def get_all_builds(db: Session, skip: int = 0, limit: int = 50) -> list[Build]:
    return db.query(Build).order_by(Build.created_at.desc()).offset(skip).limit(limit).all()


def delete_build(db: Session, build_id: int) -> None:
    build = get_build(db, build_id)
    db.delete(build)
    db.commit()


def get_build_plan(db: Session, build_id: int):
    build = get_build(db, build_id)
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
