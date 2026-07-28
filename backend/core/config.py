# core/config.py
# Central configuration — all env vars loaded here.
# Swap mock AI for real by setting OPENAI_API_KEY in .env

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "CarMods AI"
    environment: str = Field(default="development", alias="ENVIRONMENT")

    # Database
    database_url: str = Field(default="sqlite:///./carmods.db", alias="DATABASE_URL")

    @field_validator("database_url")
    @classmethod
    def _normalize_postgres_scheme(cls, v: str) -> str:
        # Railway/Heroku-style managed Postgres hand out "postgres://" URLs,
        # but SQLAlchemy 2.x's psycopg2 dialect only recognizes "postgresql://".
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Job queue — backs the async recommendation-generation worker
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")

    # AI — set one of these to enable real AI responses
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o", alias="OPENAI_MODEL")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")

    # Set to "openai" or "anthropic" to swap providers
    ai_provider: str = Field(default="mock", alias="AI_PROVIDER")

    # Auth — set a strong random value in production .env
    secret_key: str = Field(
        default="dev-secret-change-in-production-set-SECRET_KEY-env-var",
        alias="SECRET_KEY",
    )

    # CORS
    allowed_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:4173"],
        alias="ALLOWED_ORIGINS"
    )

    # The frontend's own URL — the backend needs this to build links that go
    # *into* emails (verification, password reset), since those are opened
    # in a browser pointed at the frontend, not at this API.
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")

    # Email — "mock" (default) logs the full message instead of sending it,
    # same pattern as AI_PROVIDER=mock. Set EMAIL_PROVIDER=smtp + the SMTP_*
    # vars below to actually send (works with Gmail, SendGrid, Postmark, SES,
    # or any other SMTP-capable provider — no vendor lock-in).
    email_provider:   str = Field(default="mock", alias="EMAIL_PROVIDER")
    smtp_host:        str = Field(default="", alias="SMTP_HOST")
    smtp_port:        int = Field(default=587, alias="SMTP_PORT")
    smtp_user:        str = Field(default="", alias="SMTP_USER")
    smtp_password:    str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email:  str = Field(default="noreply@carmods.ai", alias="SMTP_FROM_EMAIL")
    smtp_use_tls:     bool = Field(default=True, alias="SMTP_USE_TLS")

    # Email-verification gating — both default to today's fully-open
    # behavior. Each is a config change, not a code change, by design:
    #   - the blanket switch below turns on a hard gate at login for everyone
    #   - the per-feature list lets specific *future* endpoints (wired with
    #     the require_verified_email() dependency in routers/auth.py) be
    #     gated individually without touching the auth system itself
    require_email_verification_to_login: bool = Field(
        default=False, alias="REQUIRE_EMAIL_VERIFICATION_TO_LOGIN"
    )
    email_verification_required_features_raw: str = Field(
        default="", alias="EMAIL_VERIFICATION_REQUIRED_FEATURES"
    )

    # Product analytics — same pluggable, off-by-default pattern as AI_PROVIDER
    # and EMAIL_PROVIDER above. Unset means core/analytics.py no-ops everywhere
    # it's called; the app behaves identically to before this existed. The
    # same key value is meant to be reused as the frontend's VITE_POSTHOG_KEY —
    # PostHog project API keys are designed to be public/client-safe.
    posthog_api_key: str = Field(default="", alias="POSTHOG_API_KEY")
    posthog_host:    str = Field(default="https://us.i.posthog.com", alias="POSTHOG_HOST")

    # Billing — same off-by-default pattern as the providers above. Unset
    # means routers/billing.py returns a clear "billing isn't configured"
    # error instead of calling out to Stripe with an empty key.
    stripe_secret_key:     str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_price_id_pro:   str = Field(default="", alias="STRIPE_PRICE_ID_PRO")

    @property
    def billing_configured(self) -> bool:
        return bool(self.stripe_secret_key and self.stripe_price_id_pro)

    # Soft-launch switch: default OFF so the free-tier caps (1 saved build,
    # 15 advisor messages/day — services/billing_service.py) stop blocking
    # anyone, without deleting the enforcement code or the Stripe
    # integration behind it. The caps were sized from a guess, not real
    # usage data; this lets real usage happen first and captures actual
    # willingness-to-pay signal (the "Would you pay for more of this?"
    # prompt) instead. Flip back to True once that signal justifies
    # re-enabling the paywall.
    enforce_usage_limits: bool = Field(default=False, alias="ENFORCE_USAGE_LIMITS")

    @property
    def email_verification_required_features(self) -> set[str]:
        return {
            f.strip() for f in self.email_verification_required_features_raw.split(",")
            if f.strip()
        }

    @property
    def use_real_ai(self) -> bool:
        return bool(self.anthropic_api_key or self.openai_api_key)

    @property
    def ai_model(self) -> str:
        return self.openai_model

    @property
    def configured_ai_provider(self) -> str:
        """Which provider generate_chat_response/generate_build_recommendations
        (services/ai_service.py) will actually try first — used by both of
        those call sites' request logging (models.user.AiRequestLog) so the
        "which provider" label can't drift out of sync with the real
        provider-selection logic."""
        if self.anthropic_api_key:
            return "anthropic"
        if self.openai_api_key:
            return "openai"
        return "mock"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"
        populate_by_name = True


_DEV_SECRET_KEY = "dev-secret-change-in-production-set-SECRET_KEY-env-var"


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    if s.is_production and s.secret_key == _DEV_SECRET_KEY:
        raise RuntimeError(
            "Refusing to start: ENVIRONMENT=production but SECRET_KEY is still the "
            "insecure default. Set a strong random SECRET_KEY in the environment."
        )
    return s


settings = get_settings()
