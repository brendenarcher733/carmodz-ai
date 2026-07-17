# core/redis_pool.py
# Shared arq Redis connection pool. One pool is created at FastAPI startup
# (see main.py's lifespan) and reused for every job enqueue *and* as the
# backing store for the Redis rate limiter (core/rate_limit.py) — creating a
# new connection per request would be wasteful and is the kind of thing that
# quietly exhausts Redis's max client connections under load.

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from core.config import settings


def redis_settings_from_url(url: str) -> RedisSettings:
    # RedisSettings.from_dsn parses scheme (including "rediss://" for TLS,
    # which managed Redis add-ons like Railway's require), host, port,
    # password, and db index in one pass — hand-rolling this with urlparse
    # previously silently dropped TLS support.
    return RedisSettings.from_dsn(url)


async def get_redis_pool() -> ArqRedis:
    return await create_pool(redis_settings_from_url(settings.redis_url))
