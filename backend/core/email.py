# core/email.py
# Pluggable outbound email — mirrors the AI_PROVIDER=mock pattern in
# core/config.py. No email provider exists anywhere else in this codebase,
# so "mock" (log the full message instead of sending it) is the default —
# the verification/reset flows that depend on this are fully testable today,
# and switching to a real provider later is a config change, not a code one.
#
# Two real transports:
#   - smtp: smtplib (stdlib), works with Gmail, SendGrid, Postmark, SES, or
#     anything else that exposes SMTP credentials. CONFIRMED LIVE IN
#     PRODUCTION (2026-11-06): Railway blocks outbound SMTP at the network
#     level — port 587 and Brevo's own documented 2525 workaround both
#     failed with a socket-level TimeoutError connecting out. Left in place
#     for anyone running this outside Railway, or on a host that doesn't
#     block it.
#   - brevo_api: Brevo's transactional-email HTTP API, over port 443 like
#     every other outbound call this app already makes successfully
#     (Anthropic, PostHog) — not subject to the SMTP-port block above. This
#     is Brevo-specific (not a generic "any HTTP provider" abstraction);
#     swap providers later by adding another branch here, same as smtp.

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

_BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    if settings.email_provider == "smtp":
        _send_via_smtp(to, subject, text, html)
    elif settings.email_provider == "brevo_api":
        _send_via_brevo_api(to, subject, text, html)
    else:
        # .warning(), not .info() — deliberate. Nothing in this app
        # configures logging levels/handlers, so the default root level
        # (WARNING) would silently swallow an .info() call, and the mock
        # transport's entire purpose is to be visible enough to actually
        # find verification/reset links during testing.
        logger.warning(
            "EMAIL [mock — set EMAIL_PROVIDER=smtp or brevo_api to actually send] to=%s subject=%r\n%s",
            to, subject, text,
        )


def _send_via_smtp(to: str, subject: str, text: str, html: str | None) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to
    msg.attach(MIMEText(text, "plain"))
    if html:
        msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to], msg.as_string())


def _send_via_brevo_api(to: str, subject: str, text: str, html: str | None) -> None:
    payload = {
        "sender": {"email": settings.smtp_from_email},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": text,
    }
    if html:
        payload["htmlContent"] = html

    resp = httpx.post(
        _BREVO_API_URL,
        headers={
            "api-key": settings.brevo_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json=payload,
        timeout=10,
    )
    resp.raise_for_status()
