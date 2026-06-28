# core/redis_pool.py
# Shared arq Redis connection pool. One pool is created at FastAPI startup
# (see main.py's lifespan) and reused for every job enqueue — creating a new
# connection per request would be wasteful and is the kind of thing that
# quietly exhausts Redis's max client connections under load.

from urllib.parse import urlparse

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from core.config import settings


def redis_settings_from_url(url: str) -> RedisSettings:
    parsed = urlparse(url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


async def get_redis_pool() -> ArqRedis:
    return await create_pool(redis_settings_from_url(settings.redis_url))
