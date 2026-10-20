# routers/guides.py
# On-demand install guide for one recommendation — public (no auth
# required), same reasoning as routers/vehicles.py and routers/plans.py:
# this isn't user-specific, and the recommendation it's for might not even
# be persisted (anonymous preview never saves anything). No `db` dependency
# at all — nothing here reads or writes the database.
#
# Rate-limited the same way every other anonymous-reachable AI-cost
# endpoint in this app is (routers/plans.py's preview_rate_limit,
# routers/advisor.py's chat_rate_limit) — this can trigger a real paid AI
# call, so it needs the same abuse guard.

from fastapi import APIRouter, Depends

from core import analytics
from core.rate_limit import RateLimiter
from models.guide import GuideRequest, InstallGuide
from services.guide_service import generate_install_guide

router = APIRouter(prefix="/api/guides", tags=["Install Guides"])

guide_rate_limit = RateLimiter(times=20, seconds=600, scope="install_guide")


@router.post("/", response_model=InstallGuide, dependencies=[Depends(guide_rate_limit)])
def create_install_guide(data: GuideRequest):
    """Always returns 200 — services.guide_service.generate_install_guide
    falls back to a deterministic local template on any AI failure, the
    same way the recommendation pipeline falls back to mock_ai. A genuine
    HTTP-level failure (network, rate limit, an unexpected bug) is what the
    frontend's retry control is for."""
    guide = generate_install_guide(data)
    analytics.capture("install_guide_generated", {"category": data.category, "difficulty": data.difficulty})
    return guide
