# main.py — CarMods AI FastAPI Application Entry Point

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from core import analytics, posthog_logs
from core.config import settings
from core.database import init_db
from core.redis_pool import get_redis_pool
from core.security import decode_access_token
from routers import builds, advisor, auth, admin, billing, plans, vehicles, guides, shops


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables + the shared arq Redis pool on startup."""
    init_db()
    analytics.initialize()
    posthog_logs.initialize()
    app.state.redis_pool = await get_redis_pool()
    print(f"✅ CarMods AI backend started [{settings.environment}]")
    print(f"   AI Provider: {settings.ai_provider}")
    print(f"   Redis: {settings.redis_url}")
    if not settings.is_production:
        print(f"   Docs: http://localhost:8000/docs")
    yield
    posthog_logs.shutdown()
    analytics.shutdown()
    await app.state.redis_pool.aclose()


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

# CORS — only the configured frontend origin(s) may call this API with credentials.
# allow_credentials=True is required for the refresh-token cookie
# (routers/auth.py) to be sent/received cross-origin at all; X-CSRF-Token is
# that flow's CSRF header, not sent by default without being explicitly allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def posthog_request_context(request: Request, call_next):
    """Identify PostHog activity with the authenticated user's primary key.

    The access token is verified before its subject is used, matching the
    application's authentication scheme. Login has no bearer token yet and
    establishes its context after authentication in the route itself.
    """
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    user_id = decode_access_token(token) if scheme.lower() == "bearer" and token else None

    with analytics.request_context(user_id):
        return await call_next(request)


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
app.include_router(plans.router)
app.include_router(advisor.router)
app.include_router(admin.router)
app.include_router(billing.router)
app.include_router(vehicles.router)
app.include_router(guides.router)
app.include_router(shops.router)


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "ai_provider": settings.ai_provider,
    }
