# AI Evaluation Framework

Tests the one thing unit tests can't: whether `services.ai_service.generate_build_recommendations` actually produces good, safe, schema-conformant output when it talks to a real model. A passing pytest suite proves the code runs; it says nothing about whether Claude just told a Tesla owner to install a turbocharger.

## Why this exists

Prompt changes are silent regressions waiting to happen. Nothing in a normal CI run catches "the new prompt wording made the model blow the budget 40% more often" or "category coverage quietly dropped because of one extra sentence in the system prompt." This harness turns "does the AI still behave correctly" into something you run, not something you guess at by eyeballing a few outputs.

## Folder structure

```
backend/evals/
├── README.md          — this file
├── schemas.py          — EvalCase / CheckResult / EvalResult / SuiteReport contracts
├── golden_dataset.py   — the 10 golden cases, each with a documented reason
├── checks.py           — deterministic checks (budget, duplicates, coverage, forbidden keywords)
├── judge.py            — LLM-as-judge plausibility check (Haiku, probabilistic)
├── cassettes.py         — record/replay system for deterministic CI
├── runner.py           — orchestrates execution + scoring
├── cli.py              — `python -m evals.cli run|record`
├── cassettes/           — recorded API responses, one JSON file per case (committed to git)
└── reports/             — eval run output, gitignored except for manual inspection
```

## What gets checked, and why each one is blocking or a warning

| Check | Severity | What it catches |
|---|---|---|
| `ai_succeeded` | blocking | The call returned `None` — either the API/network failed, or our own validation rejected the model's output and we silently fell back to mock. Either way, the eval should know. |
| `budget_adherence` | blocking | Sum of `price_min` exceeds 115% of stated budget. Ground truth — there's no judgment call here. |
| `no_duplicates` | blocking | Same mod recommended twice (often under slightly different names when a model is padding toward a target count). |
| `category_coverage` | warning | Fraction of requested categories actually represented. Soft because concentrating budget in fewer categories can be a legitimate call; tracked so silent drift is visible. |
| `forbidden_keywords` | blocking | Deterministic hallucination check — only meaningful for cases that define a keyword list (e.g. an EV cannot have a turbocharger). Ground truth, not a judgment call, so it blocks. |
| `latency` | warning | Response took longer than 8s. Not a correctness issue, but a UX one worth tracking. |
| `llm_judge_plausibility` | warning | Open-ended "does this part plausibly exist for this exact vehicle" judgment from a second model call (Haiku). Deliberately a warning, not blocking — a probabilistic judge can be wrong, and a false positive here shouldn't fail a build the way a forbidden-keyword hit does. |

The split matters: **forbidden_keywords is the only hallucination check that blocks**, because it's the only one with ground truth. The judge is real signal worth watching, not a hard gate — that distinction is the actual design decision here, not an afterthought.

## The golden dataset

10 cases in `golden_dataset.py`, each with a `reason` field stating exactly what failure mode it probes — budget floor/ceiling, beginner-vs-advanced mod gating, single vs. multi-category coverage, an EV hallucination canary, and an exotic-platform plausibility case where a fixed keyword list can't help (nobody can enumerate every brand that doesn't plausibly serve a Ferrari 296 GTB — that's exactly what the LLM judge is for). A golden dataset of "examples I thought of" isn't useful; a golden dataset where every entry has a stated purpose is.

## Replay vs. live — and why both exist

**Replay** (`--mode replay`, the CI default) loads a recorded API response from `cassettes/<case_id>.json` and injects a fake Anthropic client into `_claude_build_recommendations` via its `client=` parameter. The real validation code still runs — Pydantic schema validation, the budget/duplicate business rules, all of it — only the network call is faked. This means replay mode genuinely catches regressions in the validation logic (tighten a Pydantic constraint and an old cassette can start failing), it just can't catch a regression in the *prompt* itself, since the model never runs.

**Live** (`--mode live`) calls the real API. Costs money, takes longer, and model behavior can drift run to run — so it's not a per-PR gate, it's a nightly/on-demand signal (see `.github/workflows/eval.yml`). This is also the only mode where the LLM-judge check (`--judge`) makes sense, since replaying a cassette doesn't run the model in the first place.

Recording a cassette is a deliberate, reviewable action, not an automatic side effect:

```bash
python -m evals.cli record --all                       # record everything
python -m evals.cli record --case-id ev_no_ice_parts    # record one case
```

When you change the prompt in `ai_service.py`, the right workflow is: run live locally, look at the diff in behavior, re-record cassettes, commit the new cassettes alongside the prompt change. The cassette diff in the PR *is* the documentation of what the prompt change actually did to model output.

## Running it

```bash
cd backend
python -m evals.cli run --mode replay                          # fast, free, what CI runs on every PR
python -m evals.cli run --mode live                             # real API calls, no judge
python -m evals.cli run --mode live --judge                     # full sweep including plausibility judging
python -m evals.cli run --mode live --case-id baseline_mid_budget_daily   # one case
python -m evals.cli run --mode replay --output evals/reports/my_run.json  # persist the full report
```

Exit code is `1` if any case fails a blocking check — that's what CI keys off, and it's also what you should key off in a pre-merge hook if you want one.

## Token usage and cost tracking

`_claude_build_recommendations` takes an optional `on_usage` callback (added specifically for this harness, see `ai_service.py`) that fires with `(input_tokens, output_tokens)` after a successful call. The runner captures this per case and converts it to an estimated cost via a small static pricing table in `runner.py`. This is the same seam a future production cost-telemetry feature would hook into — it didn't need building twice.

## Known limitations (said out loud, not buried)

- **Forbidden-keyword hallucination detection only covers what someone thought to write down.** It's ground truth for the cases that have a list (EVs and turbos), and silent for everything else — that's what the judge check is for, and the judge is explicitly probabilistic, not a replacement.
- **Replay mode can't catch prompt regressions.** It validates the validation logic, not the prompt. Live mode is required to actually exercise prompt changes.
- **10 golden cases is a starting set, not a ceiling.** Each new case should earn its place with a `reason`, the same as the first 10 — growth here should track newly discovered failure modes, not just "more examples."
- **Live mode costs real money per run.** That's why it's scheduled, not per-PR, and why the judge step uses Haiku instead of Sonnet.
