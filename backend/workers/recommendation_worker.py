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

MAX_TRIES = 3
RETRY_BACKOFF_SECONDS = 5      # linear backoff: 5s, 10s before attempts 2, 3
JOB_TIMEOUT_SECONDS = 90       # observed live latency is 25-45s; this is ~2x headroom,
                                # not the 300s arq default, so a hung call doesn't camp a worker slot
REAP_THRESHOLD_MINUTES = 3     # how long "generating" can persist before the cron reaper assumes the worker died


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

        # generate_build_recommendations (and everything it calls) is a sync,
        # blocking call (the Anthropic SDK isn't used in async mode here —
        # see the writeup for why that tradeoff was fine for this refactor).
        # asyncio.to_thread offloads it so this worker's event loop can keep
        # servicing other concurrent jobs while this one waits on the network.
        ai_mods = await asyncio.to_thread(generate_build_recommendations, build)

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
