# core/rate_limit.py
# Lightweight in-memory fixed-window rate limiter — no Redis dependency.
#
# Single-process only: state lives in this module's memory, so it does not
# share counts across multiple uvicorn workers/instances. Fine for a single
# MVP deployment; swap for a Redis-backed limiter before scaling horizontally.

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_key(request: Request, scope: str) -> str:
    # Trust X-Forwarded-For only if you control the proxy in front of this app.
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{scope}:{ip}"


class RateLimiter:
    """FastAPI dependency: Depends(RateLimiter(times=5, seconds=60, scope='login'))"""

    def __init__(self, times: int, seconds: int, scope: str):
        self.times = times
        self.seconds = seconds
        self.scope = scope

    def __call__(self, request: Request) -> None:
        key = _client_key(request, self.scope)
        now = time.monotonic()
        window_start = now - self.seconds

        with _lock:
            hits = _buckets[key]
            # Drop timestamps outside the current window
            while hits and hits[0] < window_start:
                hits.pop(0)

            if len(hits) >= self.times:
                retry_after = max(1, int(self.seconds - (now - hits[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests — please slow down.",
                    headers={"Retry-After": str(retry_after)},
                )

            hits.append(now)
