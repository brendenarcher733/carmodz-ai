# core/email.py
# Pluggable outbound email — mirrors the AI_PROVIDER=mock pattern in
# core/config.py. No email provider exists anywhere else in this codebase,
# so "mock" (log the full message instead of sending it) is the default —
# the verification/reset flows that depend on this are fully testable today,
# and switching to a real provider later is a config change, not a code one.
#
# smtplib (stdlib) rather than a vendor SDK: works with Gmail, SendGrid,
# Postmark, SES, or anything else that exposes SMTP credentials, with zero
# new dependencies and no lock-in to a specific provider this project hasn't
# chosen.

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    if settings.email_provider == "smtp":
        _send_via_smtp(to, subject, text, html)
    else:
        # .warning(), not .info() — deliberate. Nothing in this app
        # configures logging levels/handlers, so the default root level
        # (WARNING) would silently swallow an .info() call, and the mock
        # transport's entire purpose is to be visible enough to actually
        # find verification/reset links during testing.
        logger.warning(
            "EMAIL [mock — set EMAIL_PROVIDER=smtp to actually send] to=%s subject=%r\n%s",
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
