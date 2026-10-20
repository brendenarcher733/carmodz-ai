# core/analytics.py
# Pluggable server-side product analytics (PostHog) — mirrors the
# AI_PROVIDER=mock / EMAIL_PROVIDER=mock pattern in core/config.py and
# core/email.py. Missing production configuration is a no-op; development
# initialization fails loudly so silently missed events are visible.
#
# Test isolation (ENVIRONMENT=test, see core/config.py's is_testing): under
# pytest, _client() always returns None regardless of whether a real
# POSTHOG_API_KEY is configured — every public function below already
# treats "client is None" as its no-op path, so this one guard is enough to
# make the entire module inert under test without duplicating that check
# everywhere. Production and ordinary local-dev behavior (real key = real
# client; missing key = no-op in prod, loud RuntimeError in dev) are
# completely unchanged — is_testing only ever makes this module do *less*.

import atexit
import logging
from contextlib import contextmanager
from functools import lru_cache

from core.config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def _client():
    if settings.is_testing or not settings.posthog_api_key:
        return None
    from posthog import Posthog
    return Posthog(
        project_api_key=settings.posthog_api_key,
        host=settings.posthog_host,
        enable_exception_autocapture=True,
        privacy_mode=False,
    )


def client():
    """Return the process-wide PostHog client for supported SDK wrappers."""
    return _client()


def initialize() -> None:
    """Construct the process-wide PostHog client during FastAPI startup."""
    if settings.is_testing:
        return
    client = _client()
    if client is None:
        if not settings.is_production:
            raise RuntimeError(
                "POSTHOG_API_KEY variable required by PostHog is missing or un-configured, "
                "this causes events to be silently missed. This error stops appearing once "
                "POSTHOG_API_KEY is configured"
            )
        return
    atexit.register(client.shutdown)


def shutdown() -> None:
    """Flush PostHog events during FastAPI shutdown."""
    client = _client()
    if client is not None:
        client.flush()
        client.shutdown()


@contextmanager
def request_context(distinct_id: str | int | None):
    """Bind a stable user ID to all PostHog activity for one HTTP request.

    The context also associates exception autocapture with the authenticated
    user. Anonymous requests get an isolated context without an identity.
    """
    client = _client()
    if client is None:
        yield
        return

    with client.new_context():
        if distinct_id is not None:
            client.identify_context(str(distinct_id))
        yield


def capture(
    event: str,
    properties: dict | None = None,
    distinct_id: str | int | None = None,
) -> None:
    """Capture an event, inheriting request identity when available.

    Calls outside an identified request may omit ``distinct_id`` to record a
    genuinely personless event rather than grouping visitors under a shared
    placeholder.
    """
    client = _client()
    if client is None:
        logger.debug("ANALYTICS [no-op — set POSTHOG_API_KEY to enable] %s: %r", event, properties)
        return
    if distinct_id is None:
        client.capture(event, properties=properties)
    else:
        client.capture(event, distinct_id=str(distinct_id), properties=properties)


def identify(distinct_id: str | int, properties: dict | None = None) -> None:
    client = _client()
    if client is None:
        logger.debug("ANALYTICS [no-op — set POSTHOG_API_KEY to enable] identify %s: %r", distinct_id, properties)
        return
    client.set(distinct_id=str(distinct_id), properties=properties)
