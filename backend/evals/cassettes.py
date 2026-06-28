# evals/cassettes.py
# Record/replay system, same idea as VCR-style HTTP test fixtures: a "cassette"
# is a recorded real API response, replayed later without hitting the network.
#
# Why this exists: live evals cost real money and real latency, and depend on
# the Anthropic API being up. Running them on every single PR is the kind of
# thing that looks rigorous and is actually just expensive and flaky. Replay
# mode runs the exact same validation code (_claude_build_recommendations is
# called for real, with a fake client injected) against a recorded response,
# so it still catches regressions in the validation/business-rule logic —
# it just can't catch a regression in the prompt itself, since the model
# never actually runs. That's what live mode (scheduled, not per-PR) is for.

import json
import time
from pathlib import Path
from types import SimpleNamespace

CASSETTE_DIR = Path(__file__).parent / "cassettes"


class FakeAnthropicClient:
    """Drop-in replacement for anthropic.Anthropic — implements only the
    .messages.create() surface _claude_build_recommendations actually calls."""

    def __init__(self, cassette: dict):
        self._cassette = cassette
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        tool_block = SimpleNamespace(type="tool_use", input=self._cassette["tool_input"])
        usage = SimpleNamespace(
            input_tokens=self._cassette["input_tokens"],
            output_tokens=self._cassette["output_tokens"],
        )
        return SimpleNamespace(content=[tool_block], usage=usage)


def cassette_path(case_id: str) -> Path:
    return CASSETTE_DIR / f"{case_id}.json"


def has_cassette(case_id: str) -> bool:
    return cassette_path(case_id).exists()


def load_cassette(case_id: str) -> dict:
    path = cassette_path(case_id)
    if not path.exists():
        raise FileNotFoundError(
            f"No cassette recorded for case_id={case_id!r}. "
            f"Run `python -m evals.cli record --case-id {case_id}` with a live API key first."
        )
    return json.loads(path.read_text())


def save_cassette(case_id: str, model: str, tool_input: dict, input_tokens: int, output_tokens: int, latency_ms: float) -> Path:
    CASSETTE_DIR.mkdir(parents=True, exist_ok=True)
    cassette = {
        "case_id": case_id,
        "model": model,
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tool_input": tool_input,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "latency_ms": round(latency_ms, 1),
    }
    path = cassette_path(case_id)
    path.write_text(json.dumps(cassette, indent=2))
    return path


def record_case(case) -> dict:
    """Run a case live and persist the result as a cassette. Imported lazily
    to avoid a hard dependency on the real Anthropic client for pure-replay use."""
    from services.ai_service import _claude_build_recommendations

    usage = {}
    start = time.monotonic()
    recs = _claude_build_recommendations(
        case.build,
        on_usage=lambda i, o: usage.update(input_tokens=i, output_tokens=o),
    )
    latency_ms = (time.monotonic() - start) * 1000

    if recs is None:
        raise RuntimeError(
            f"Live call for case_id={case.id!r} failed validation or the API call itself — "
            f"refusing to record a failing cassette. Check logs above for the actual error."
        )

    # Reconstruct what the raw tool input looked like (recs is the cleaned,
    # already-validated dict list — wrap it back in the envelope shape the
    # tool actually returns so replay exercises the real validation path,
    # not a shortcut).
    tool_input = {"recommendations": recs}

    return {
        "path": save_cassette(
            case.id, "claude-sonnet-4-6", tool_input,
            usage.get("input_tokens"), usage.get("output_tokens"), latency_ms,
        ),
        "latency_ms": latency_ms,
        "usage": usage,
    }
