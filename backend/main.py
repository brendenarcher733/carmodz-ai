# main.py — CarMods AI FastAPI Application Entry Point

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
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
    if not settings.is_production:
        print(f"   Docs: http://localhost:8000/docs")
    yield


app = FastAPI(
    title="CarMods AI API",
    description="AI-powered car modification budgeting and planning",
    version="1.0.0",
    lifespan=lifespan,
    # Hide interactive API docs / schema in production — don't advertise the
    # full surface area of the API to anonymous internet traffic.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# CORS — only the configured frontend origin(s) may call this API with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Defense-in-depth headers — mitigate clickjacking, MIME sniffing, and
    leaking this app's URLs via the Referer header on outbound links."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


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
