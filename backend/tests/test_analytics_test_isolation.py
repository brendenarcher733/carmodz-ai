# tests/test_analytics_test_isolation.py
#
# Proves the test suite itself is isolated from PostHog: no real network
# call, no dependency on a real POSTHOG_API_KEY, and — just as importantly —
# that this isolation is achieved WITHOUT changing production or ordinary
# local-dev behavior (core/analytics.py, core/posthog_logs.py).
#
# conftest.py already sets ENVIRONMENT=test for the whole suite (that's what
# makes settings.is_testing True here) — these tests exercise the
# is_testing branch directly and then explicitly flip it off to prove the
# pre-existing production/dev branches are untouched.

import core.analytics as analytics
import core.posthog_logs as posthog_logs
from core.config import settings


def _clear_caches():
    analytics._client.cache_clear()


# ── Under test environment: no real client is ever constructed ─────────────

def test_is_testing_is_true_under_the_test_suite():
    assert settings.is_testing is True


def test_client_is_none_under_test_even_with_a_real_looking_key_configured(monkeypatch):
    """The actual requirement: test execution must not require (or even use)
    a real POSTHOG_API_KEY. Simulate one being configured, as it genuinely
    is in backend/.env, and confirm it's still ignored."""
    monkeypatch.setattr(settings, "posthog_api_key", "phc_fake_looks_real_1234567890")
    _clear_caches()
    try:
        assert analytics.client() is None
    finally:
        _clear_caches()


def test_posthog_is_never_constructed_under_test(monkeypatch):
    """Patches posthog.Posthog itself to blow up if instantiated — the
    strongest available proof that analytics._client() never gets far enough
    to construct a real client (let alone call out to the network) while
    settings.is_testing is True."""
    import posthog as posthog_module

    def _must_not_be_called(*args, **kwargs):
        raise AssertionError("posthog.Posthog() was constructed during a test run")

    monkeypatch.setattr(posthog_module, "Posthog", _must_not_be_called)
    monkeypatch.setattr(settings, "posthog_api_key", "phc_fake_looks_real_1234567890")
    _clear_caches()
    try:
        assert analytics.client() is None
        analytics.capture("should_be_a_no_op", {"x": 1})
        analytics.identify("1", {"x": 1})
        with analytics.request_context("1"):
            pass
        analytics.initialize()
        analytics.shutdown()
    finally:
        _clear_caches()


def test_posthog_logs_initialize_is_a_no_op_under_test(monkeypatch):
    """Same guarantee for the separate OTLP log exporter — must not require
    opentelemetry to be installed or a real key, and must not configure a
    logger provider, under test."""
    monkeypatch.setattr(settings, "posthog_api_key", "phc_fake_looks_real_1234567890")
    posthog_logs.initialize()
    assert posthog_logs._logger_provider is None
    posthog_logs.shutdown()  # must not raise even though nothing was initialized


def test_capture_and_identify_do_not_raise_without_any_posthog_key(monkeypatch):
    """Test execution must not require a real key at all — simulate it being
    entirely absent (the opposite extreme from the "looks configured" tests
    above) and confirm nothing breaks."""
    monkeypatch.setattr(settings, "posthog_api_key", "")
    _clear_caches()
    try:
        analytics.capture("event_with_no_key_configured")
        analytics.identify("1")
        assert analytics.client() is None
    finally:
        _clear_caches()


# ── Outside test environment: existing production/dev behavior is intact ───

def test_production_behavior_with_real_key_is_unchanged(monkeypatch):
    """With is_testing forced off and a real-looking key configured, the
    client must actually be constructed (mirrors pre-existing behavior) —
    proves this feature only ever suppresses PostHog, it never does so
    unconditionally. The real posthog.Posthog is swapped for a recording
    fake here deliberately — this test is about analytics.py's own
    decision logic, not about exercising the real SDK against a live host,
    even with a fake key."""
    import posthog as posthog_module

    constructed_with = {}

    class _FakeClient:
        def __init__(self, **kwargs):
            constructed_with.update(kwargs)

        def shutdown(self):
            pass

    monkeypatch.setattr(posthog_module, "Posthog", _FakeClient)
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "posthog_api_key", "phc_fake_looks_real_1234567890")
    assert settings.is_testing is False
    _clear_caches()
    try:
        result = analytics.client()
        assert result is not None
        assert constructed_with.get("project_api_key") == "phc_fake_looks_real_1234567890"
        analytics.initialize()  # must not raise in production even if it were unconfigured
    finally:
        _clear_caches()


def test_production_with_no_key_is_a_silent_noop_unchanged(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "posthog_api_key", "")
    assert settings.is_testing is False
    _clear_caches()
    try:
        assert analytics.client() is None
        analytics.initialize()  # production: no-op, must NOT raise
    finally:
        _clear_caches()


def test_development_with_no_key_still_fails_loudly_unchanged(monkeypatch):
    """The pre-existing "fail loudly in real local dev" behavior (so a
    developer notices a missing key instead of silently losing events) must
    survive this change completely — it only fires when is_testing is
    False, exactly like before this feature existed."""
    import pytest

    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "posthog_api_key", "")
    assert settings.is_testing is False
    _clear_caches()
    try:
        with pytest.raises(RuntimeError, match="POSTHOG_API_KEY"):
            analytics.initialize()
    finally:
        _clear_caches()
