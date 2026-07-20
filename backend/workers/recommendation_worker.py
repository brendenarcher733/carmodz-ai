# workers/recommendation_worker.py
# arq worker: generates AI recommendations for a build out-of-band so the
# HTTP request that creates the build never blocks on a 25-45s Claude call.
#
# Run with:  arq workers.recommendation_worker.WorkerSettings
#
# Two distinct failure-handling paths, on purpose:
#   1. "The AI call ran but didn't produce a usable result" (None from
#      generate_build_recommendations, or output that fails final Pydantic
#      validation) is an EXPECTED failure mode — ai_service.py already
#      retries nothing internally, it just reports failure. This task
#      explicitly retries with backoff via `raise Retry(...)`, and on the
#      final attempt degrades to the mock engine rather than leaving the
#      build with nothing. This is NOT the same thing as arq's built-in
#      exception-based retry.
#   2. An actual unhandled exception (DB write failure, a bug) is an
#      UNEXPECTED failure. That's left to propagate so arq's own
#      max_tries/backoff takes over, and the except block marks the build
#      failed so it's never silently stuck.
#
# A third failure mode neither of the above can catch: the WORKER PROCESS
# itself dying mid-job (crash, OOM, redeploy) before it gets the chance to
# raise or return anything. arq's retry logic never even runs in that case —
# there's no exception, just a job that never finishes. reap_stuck_builds
# (a cron job, not triggered by job failure at all) is the independent sweep
# that catches that.

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta

from arq import cron
from arq.worker import Retry
from pydantic import ValidationError

from core.config import settings
from core.database import SessionLocal
from core.redis_pool import redis_settings_from_url
# Importing build/recommendation alone leaves the ORM mapper unable to
# resolve builds.user_id's FK to 'users' — that table's model is never
# registered in this process unless its module is imported somewhere.
# The main app gets this for free via init_db(); the worker has no
# equivalent startup hook, so it's done explicitly here instead.
from models import user, chat  # noqa: F401
from models.build import Build
from models.recommendation import ModRecommendation, Recommendation
from services.ai_service import generate_build_recommendations
from services.mock_ai import generate_recommendations as mock_recommendations

logger = logging.getLogger(__name__)

MAX_TRIES = 2                  # was 3 — the Anthropic/OpenAI clients now enforce their own
                                # timeout (services/ai_service.py), so a stuck 3rd attempt was
                                # pure worst-case tail latency for little added reliability;
                                # one retry already covers the common transient-failure case,
                                # and the immediate mock fallback after that is instant anyway
RETRY_BACKOFF_SECONDS = 5      # linear backoff: 5s before attempt 2
JOB_TIMEOUT_SECONDS = 75       # ai_service.RECOMMENDATIONS_REQUEST_TIMEOUT_SECONDS=60 is this
                                # task's own per-call ceiling; this needs real headroom above
                                # that (not right up against it, and not the old 90s, which had
                                # no relationship to the client timeout at all — it was just a
                                # guess). Worst case end-to-end is now 75 + 5 + 75 ≈ 155s instead
                                # of the original 90*3 + 15 ≈ 285s — smaller than first attempted
                                # (95s), but that number was wrong: live testing showed a 30s
                                # client timeout was killing a large fraction of legitimate
                                # in-progress calls, since this call's own documented normal
                                # latency (25-45s) sat inside that ceiling instead of under it.
REAP_THRESHOLD_MINUTES = 3     # how long "generating" can persist before the cron reaper assumes the worker died

RECOMMENDATION_CACHE_TTL_SECONDS = 60 * 60 * 24   # 24h — long enough to catch repeat traffic on
                                                    # popular platform/budget/goal combos, short
                                                    # enough that pricing/brand info naturally
                                                    # ages out without any manual invalidation


def _recommendation_cache_key(build: Build) -> str:
    """Stable cache key over exactly the fields that affect the AI prompt.
    Exact-match only, deliberately — no fuzzy/nearby-budget matching, so a
    cache hit only ever serves a plan for the precise inputs the user gave."""
    payload = {
        "year": build.year,
        "make": (build.make or "").strip().lower(),
        "model": (build.model or "").strip().lower(),
        "budget": round(build.budget, 2),
        "goal": (build.goal or "").strip().lower(),
        "experience": (build.experience or "").strip().lower(),
        "categories": sorted(c.strip().lower() for c in (build.categories or [])),
        "is_daily": bool(build.is_daily),
        "notes": (build.notes or "").strip().lower(),
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return f"recgen:cache:{digest}"


def _persist_recommendations(db, build: Build, mods: list[ModRecommendation]) -> None:
    for mod in mods:
        db.add(Recommendation(
            build_id=build.id,
            name=mod.name,
            category=mod.category,
            description=mod.description,
            price_min=mod.price_min,
            price_max=mod.price_max,
            difficulty=mod.difficulty,
            stage=mod.stage,
            priority=mod.priority,
            warnings=mod.warnings,
            brand_tips=mod.brand_tips,
        ))


async def generate_recommendations_task(ctx: dict, build_id: int) -> dict:
    job_try = ctx.get("job_try", 1)
    db = SessionLocal()
    try:
        build = db.query(Build).filter(Build.id == build_id).first()
        if build is None:
            logger.error("generate_recommendations_task: build %s not found", build_id)
            return {"status": "skipped", "reason": "build not found"}

        build.status = "generating"
        build.status_updated_at = datetime.utcnow()
        db.commit()

        # Exact-match cache on the fields that actually shape the prompt —
        # a repeat of a popular platform/budget/goal combo (very plausible:
        # different users building the same common car on a similar budget)
        # returns in a Redis round-trip instead of a 25-45s Claude call.
        cache_key = _recommendation_cache_key(build)
        cached = await ctx["redis"].get(cache_key)
        if cached is not None:
            logger.info("Build %s: recommendation cache hit (%s)", build_id, cache_key)
            ai_mods = json.loads(cached)
        else:
            # generate_build_recommendations (and everything it calls) is a sync,
            # blocking call (the Anthropic SDK isn't used in async mode here —
            # see the writeup for why that tradeoff was fine for this refactor).
            # asyncio.to_thread offloads it so this worker's event loop can keep
            # servicing other concurrent jobs while this one waits on the network.
            ai_mods = await asyncio.to_thread(generate_build_recommendations, build)
            if ai_mods is not None:
                await ctx["redis"].set(
                    cache_key, json.dumps(ai_mods), ex=RECOMMENDATION_CACHE_TTL_SECONDS
                )

        mods: list[ModRecommendation] | None = None
        if ai_mods is not None:
            try:
                mods = [ModRecommendation(**m) for m in ai_mods]
            except ValidationError:
                logger.warning("Build %s: AI output failed final validation", build_id, exc_info=True)
                mods = None

        if mods is None:
            if job_try < MAX_TRIES:
                logger.warning("Build %s: generation failed, retrying (attempt %s/%s)", build_id, job_try, MAX_TRIES)
                raise Retry(defer=RETRY_BACKOFF_SECONDS * job_try)

            logger.warning("Build %s: generation failed after %s attempts, falling back to mock", build_id, job_try)
            mods = mock_recommendations(build)
            build.used_mock_fallback = True

        _persist_recommendations(db, build, mods)
        build.status = "ready"
        build.error_message = None
        build.status_updated_at = datetime.utcnow()
        db.commit()

        return {"status": "ready", "used_mock_fallback": build.used_mock_fallback, "mod_count": len(mods)}

    except Retry:
        raise
    except Exception as e:
        logger.exception("generate_recommendations_task crashed for build %s", build_id)
        db.rollback()
        build = db.query(Build).filter(Build.id == build_id).first()
        if build is not None:
            build.status = "failed"
            build.error_message = str(e)[:500]
            build.status_updated_at = datetime.utcnow()
            db.commit()
        raise
    finally:
        db.close()


async def reap_stuck_builds(ctx: dict) -> dict:
    """Cron sweep, not triggered by any job failure. Catches builds whose
    worker process died mid-job — the one failure mode job-level retry can't
    see, because there was never an exception to retry on."""
    db = SessionLocal()
    reaped: list[int] = []
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=REAP_THRESHOLD_MINUTES)
        stuck = (
            db.query(Build)
            .filter(Build.status == "generating", Build.status_updated_at < cutoff)
            .all()
        )
        for build in stuck:
            logger.warning("Reaping build %s — stuck in 'generating' since %s", build.id, build.status_updated_at)
            mods = mock_recommendations(build)
            _persist_recommendations(db, build, mods)
            build.status = "ready"
            build.used_mock_fallback = True
            build.error_message = "Recovered by reaper: worker did not complete the job in time"
            build.status_updated_at = datetime.utcnow()
            reaped.append(build.id)
        db.commit()
        if reaped:
            logger.warning("Reaper recovered %d stuck build(s): %s", len(reaped), reaped)
        return {"reaped": reaped}
    finally:
        db.close()


class WorkerSettings:
    functions = [generate_recommendations_task]
    cron_jobs = [cron(reap_stuck_builds, minute=set(range(0, 60, 2)), run_at_startup=False)]
    redis_settings = redis_settings_from_url(settings.redis_url)
    max_jobs = 10
    job_timeout = JOB_TIMEOUT_SECONDS
    max_tries = MAX_TRIES
    keep_result = 3600
