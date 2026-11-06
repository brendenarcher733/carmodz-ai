# tests/test_email_transport.py
#
# core/email.py's provider selection and the Brevo HTTP-API transport,
# added 2026-11-06 after confirming live in production that Railway
# blocks outbound SMTP (see core/email.py's module docstring). No real
# network call in any of these — httpx.post is monkeypatched.

from core.config import settings
from core import email as email_module


class _FakeResponse:
    def __init__(self, status_code=201):
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"status {self.status_code}")


def test_mock_provider_does_not_call_brevo_or_smtp(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "mock")
    called = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **kw: called.append(True))
    email_module.send_email("someone@example.com", "Subject", "Body")
    assert called == []


def test_brevo_api_provider_posts_to_brevo_with_expected_shape(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "brevo_api")
    monkeypatch.setattr(settings, "brevo_api_key", "fake-key")
    monkeypatch.setattr(settings, "smtp_from_email", "noreply@carmods.ai")

    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        return _FakeResponse(201)

    monkeypatch.setattr(email_module.httpx, "post", fake_post)

    email_module.send_email("driver@example.com", "Your plan", "Plain text body")

    assert captured["url"] == "https://api.brevo.com/v3/smtp/email"
    assert captured["headers"]["api-key"] == "fake-key"
    assert captured["json"]["sender"] == {"email": "noreply@carmods.ai"}
    assert captured["json"]["to"] == [{"email": "driver@example.com"}]
    assert captured["json"]["subject"] == "Your plan"
    assert captured["json"]["textContent"] == "Plain text body"
    assert "htmlContent" not in captured["json"]


def test_brevo_api_includes_html_when_given(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "brevo_api")
    monkeypatch.setattr(settings, "brevo_api_key", "fake-key")
    captured = {}
    monkeypatch.setattr(
        email_module.httpx, "post",
        lambda url, headers=None, json=None, timeout=None: (captured.update(json=json), _FakeResponse(201))[1],
    )
    email_module.send_email("driver@example.com", "Subject", "Plain", html="<p>Rich</p>")
    assert captured["json"]["htmlContent"] == "<p>Rich</p>"


def test_brevo_api_raises_on_an_error_response(monkeypatch):
    """Mirrors _send_via_smtp's own behavior: a send failure is never
    swallowed here — see services/plan_email_service.py's own docstring
    for why "email me this plan" shouldn't silently claim success."""
    monkeypatch.setattr(settings, "email_provider", "brevo_api")
    monkeypatch.setattr(settings, "brevo_api_key", "bad-key")
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **kw: _FakeResponse(401))

    import pytest
    with pytest.raises(RuntimeError):
        email_module.send_email("driver@example.com", "Subject", "Plain")
