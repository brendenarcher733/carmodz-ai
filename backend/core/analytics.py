# core/analytics.py
# Pluggable server-side product analytics (PostHog) — mirrors the
# AI_PROVIDER=mock / EMAIL_PROVIDER=mock pattern in core/config.py and
# core/email.py. POSTHOG_API_KEY unset means every call below is a no-op;
# the app behaves identically to before this existed. Server-side capture is
# the authoritative source for events tied to backend business logic (AI
# request completion + duration, signup, login) — it can't be blocked by an
# ad-blocker the way client-side capture can.

import logging
from functools import lru_cache

from core.config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def _client():
    if not settings.posthog_api_key:
        return None
    from posthog import Posthog
    return Posthog(project_api_key=settings.posthog_api_key, host=settings.posthog_host)


def capture(distinct_id: str | int, event: str, properties: dict | None = None) -> None:
    client = _client()
    if client is None:
        logger.debug("ANALYTICS [no-op — set POSTHOG_API_KEY to enable] %s: %s %r", distinct_id, event, properties)
        return
    client.capture(event, distinct_id=str(distinct_id), properties=properties)


def identify(distinct_id: str | int, properties: dict | None = None) -> None:
    client = _client()
    if client is None:
        logger.debug("ANALYTICS [no-op — set POSTHOG_API_KEY to enable] identify %s: %r", distinct_id, properties)
        return
    client.set(distinct_id=str(distinct_id), properties=properties)
