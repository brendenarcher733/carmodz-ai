"""Dedicated OpenTelemetry log export for PostHog.

Only the logger in this module has the OTLP handler. Existing application
loggers keep their configured handlers and never leave through this exporter.
"""

import logging

from core.config import settings

logger = logging.getLogger("carmods.posthog.logs")
_logger_provider = None


def initialize() -> None:
    """Configure the dedicated PostHog OTLP log exporter once per process.

    Under pytest (ENVIRONMENT=test, see core/config.py's is_testing) this is
    a complete no-op — never touches opentelemetry or PostHog — so the test
    suite doesn't need opentelemetry installed or a real POSTHOG_API_KEY
    configured. Production and ordinary local-dev behavior are unchanged."""
    global _logger_provider

    if _logger_provider is not None:
        return
    if settings.is_testing:
        return
    if not settings.posthog_api_key:
        if not settings.is_production:
            raise RuntimeError(
                "POSTHOG_API_KEY variable required by PostHog is missing or un-configured, "
                "this causes events to be silently missed. This error stops appearing once "
                "POSTHOG_API_KEY is configured"
            )
        return

    try:
        from opentelemetry._logs import set_logger_provider
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
        from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
        from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
        from opentelemetry.sdk.resources import Resource
    except ImportError as exc:
        raise RuntimeError(
            "PostHog Logs requires opentelemetry-api, opentelemetry-sdk, and "
            "opentelemetry-exporter-otlp to be installed"
        ) from exc

    _logger_provider = LoggerProvider(
        resource=Resource.create(
            {
                "service.name": "carmods-ai-backend",
                "deployment.environment": settings.environment,
            }
        )
    )
    set_logger_provider(_logger_provider)
    _logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(
                endpoint=f"{settings.posthog_host.rstrip('/')}/i/v1/logs",
                headers={"Authorization": f"Bearer {settings.posthog_api_key}"},
            )
        )
    )
    logger.addHandler(LoggingHandler(logger_provider=_logger_provider))
    logger.setLevel(logging.INFO)
    logger.propagate = False
    logger.info(
        "backend log exporter configured",
        extra={"event": "backend_log_exporter_configured"},
    )


def log_generation_job_enqueued(plan: str, defer_seconds: int) -> None:
    """Record the safe queue outcome for a newly submitted build."""
    logger.info(
        "build generation job enqueued",
        extra={
            "event": "build_generation_job_enqueued",
            "queue_tier": plan,
            "defer_seconds": defer_seconds,
        },
    )


def shutdown() -> None:
    """Flush the dedicated exporter before the FastAPI process exits."""
    global _logger_provider

    if _logger_provider is None:
        return
    logger.info(
        "backend log exporter stopping",
        extra={"event": "backend_log_exporter_stopping"},
    )
    _logger_provider.force_flush()
    _logger_provider.shutdown()
    _logger_provider = None
