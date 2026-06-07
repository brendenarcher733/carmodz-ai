# main.py — CarMods AI FastAPI Application Entry Point

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import init_db
from routers import builds, advisor, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables on startup."""
    init_db()
    print(f"✅ CarMods AI backend started [{settings.environment}]")
    print(f"   AI Provider: {settings.ai_provider}")
    print(f"   Docs: http://localhost:8000/docs")
    yield


app = FastAPI(
    title="CarMods AI API",
    description="AI-powered car modification budgeting and planning",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(builds.router)
app.include_router(advisor.router)


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "ai_provider": settings.ai_provider,
    }
