# core/config.py
# Central configuration — all env vars loaded here.
# Swap mock AI for real by setting OPENAI_API_KEY in .env

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "CarMods AI"
    environment: str = Field(default="development", alias="ENVIRONMENT")

    # Database
    database_url: str = Field(default="sqlite:///./carmods.db", alias="DATABASE_URL")

    # AI — set one of these to enable real AI responses
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o", alias="OPENAI_MODEL")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")

    # Set to "openai" or "anthropic" to swap providers
    ai_provider: str = Field(default="mock", alias="AI_PROVIDER")

    # CORS
    allowed_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:4173"],
        alias="ALLOWED_ORIGINS"
    )

    @property
    def use_real_ai(self) -> bool:
        return bool(self.anthropic_api_key or self.openai_api_key)

    @property
    def ai_model(self) -> str:
        return self.openai_model

    class Config:
        env_file = ".env"
        populate_by_name = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
