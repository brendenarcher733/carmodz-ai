# core/rate_limit.py
# Redis-backed fixed-window rate limiter.
#
# Backed by the same arq Redis pool created once at FastAPI startup and
# stored on app.state.redis_pool (see main.py's lifespan + core/redis_pool.py)
# — ArqRedis is a subclass of redis.asyncio.Redis, so it can be used directly
# for plain INCR/EXPIRE without a second connection pool. This replaces a
# prior in-memory implementation that only worked correctly for a single
# process: counts didn't survive a restart and weren't shared across
# instances, so horizontal scaling (or even a zero-downtime redeploy) would
# silently let each new process reset everyone's rate limit.

from fastapi import HTTPException, Request, status


def _client_key(request: Request, scope: str) -> str:
    # Trust X-Forwarded-For only if you control the proxy in front of this app
    # (true on Railway/Render/Fly's edge, which set/overwrite this header).
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"ratelimit:{scope}:{ip}"


class RateLimiter:
    """FastAPI dependency: Depends(RateLimiter(times=5, seconds=60, scope='login'))"""

    def __init__(self, times: int, seconds: int, scope: str):
        self.times = times
        self.seconds = seconds
        self.scope = scope

    async def __call__(self, request: Request) -> None:
        redis = request.app.state.redis_pool
        key = _client_key(request, self.scope)

        # INCR + EXPIRE in a pipeline: one round trip. EXPIRE is only armed
        # on the first hit of a window (count == 1) so a later request in the
        # same window can't push the window back out by re-arming the TTL.
        pipe = redis.pipeline(transaction=True)
        pipe.incr(key)
        count = (await pipe.execute())[0]
        if count == 1:
            await redis.expire(key, self.seconds)

        if count > self.times:
            retry_after = await redis.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests — please slow down.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
