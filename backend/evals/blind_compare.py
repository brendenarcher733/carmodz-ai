# evals/blind_compare.py
#
# The experiment the kill-memo's Critical #2 asked for: is CarMods AI's
# recommendation engine actually distinguishable from a bare call to the
# same underlying model with none of the product's prompt engineering?
#
# This is NOT an automated judge — evals/judge.py already does LLM-graded
# scoring for a different purpose (regression detection against the golden
# dataset). This produces a plain, unlabeled side-by-side HTML page for a
# HUMAN to read and form their own opinion. That's the whole point: an
# automated grader can't tell you whether a real car person would notice
# or care about the difference.
#
# Both sides call the EXACT SAME model (claude-sonnet-4-6 — see
# services/ai_service.py's _claude_build_recommendations) so the only
# variable under test is the product's own prompt/schema/validation layer,
# not "different model happened to do better." The bare side gets zero
# product-specific framing — no system prompt, no "you are an expert"
# preamble, no schema, no tool-forcing — just the plain question a real
# person would type into ChatGPT or Claude.
#
# Usage:
#   cd backend && python -m evals.blind_compare
#
# Makes 20 real, billed Anthropic API calls (10 vehicles x 2 sides) and
# takes a few minutes — requires a real ANTHROPIC_API_KEY in the
# environment. Writes a timestamped .json (raw data + the A/B answer key)
# and a .html (the actual review page) to evals/blind_compare_reports/,
# which is gitignored — these are run artifacts, not fixtures.

import html
import random
import sys
import time
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings          # noqa: E402
from models.build import BuildCreate      # noqa: E402
from services.ai_service import generate_build_recommendations  # noqa: E402

OUTPUT_DIR = Path(__file__).parent / "blind_compare_reports"
MODEL = "claude-sonnet-4-6"

# 10 real, diverse vehicle profiles — different platforms, budgets, goals,
# and experience levels, using the same goal/experience/category vocabulary
# the real Planner submits (see GOAL_META in frontend/src/pages/Builds.jsx).
VEHICLES = [
    dict(year=2018, make="Honda",      model="Civic Si",        budget=2500,  goal="daily driver upgrades",   experience="beginner",     categories=["performance", "handling"], is_daily=True),
    dict(year=2020, make="Subaru",     model="WRX",             budget=6000,  goal="street performance",       experience="intermediate", categories=["performance", "handling"], is_daily=True),
    dict(year=2015, make="Ford",       model="Mustang GT",      budget=8000,  goal="max power",                experience="advanced",     categories=["performance", "sound"],    is_daily=False),
    dict(year=2022, make="Toyota",     model="GR86",            budget=4000,  goal="track focused setup",      experience="intermediate", categories=["handling", "performance"], is_daily=False),
    dict(year=2019, make="Mazda",      model="MX-5 Miata",      budget=3000,  goal="budget performance build", experience="beginner",     categories=["handling", "performance"], is_daily=True),
    dict(year=2017, make="BMW",        model="M3",              budget=10000, goal="track focused setup",      experience="advanced",     categories=["performance", "handling"], is_daily=False),
    dict(year=2021, make="Volkswagen", model="GTI",             budget=3500,  goal="daily driver upgrades",    experience="beginner",     categories=["performance", "cosmetic"], is_daily=True),
    dict(year=2016, make="Chevrolet",  model="Camaro SS",       budget=7000,  goal="sound upgrades",           experience="intermediate", categories=["sound", "performance"],    is_daily=True),
    dict(year=2014, make="Nissan",     model="370Z",            budget=5000,  goal="street performance",       experience="intermediate", categories=["performance", "handling"], is_daily=True),
    dict(year=2019, make="Ram",        model="1500",            budget=4500,  goal="daily driver upgrades",    experience="beginner",     categories=["cosmetic", "performance"], is_daily=True),
]


def bare_model_call(vehicle: dict) -> str:
    """The 'raw ChatGPT/Claude' side — no system prompt, no schema, no
    tool-forcing, just the plain question a real person would type."""
    import anthropic
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    article = "an" if vehicle["experience"][0] in "aeiou" else "a"
    prompt = (
        f"What mods should I get for my {vehicle['year']} {vehicle['make']} {vehicle['model']}? "
        f"I have about ${vehicle['budget']:,.0f} to spend and want {vehicle['goal']}. "
        f"I'd say I'm {article} {vehicle['experience']} when it comes to modding cars."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()


def product_call(vehicle: dict) -> str:
    """The real product path — services/ai_service.py, completely
    unmodified, called exactly the way build_service.create_build calls it."""
    build = BuildCreate(
        title="blind-compare eval", notes="",
        **{k: v for k, v in vehicle.items()},
    )
    recs = generate_build_recommendations(build)
    if recs is None:
        return (
            "[The product's recommendation engine returned no result for this "
            "vehicle — either the Anthropic call failed or validation rejected "
            "it, and generate_build_recommendations() fell back to None as "
            "designed. This is a real outcome, not a formatting artifact — "
            "raw production behavior falls back to the offline mock engine here.]"
        )

    lines = []
    for r in sorted(recs, key=lambda r: r["priority"]):
        lines.append(
            f"#{r['priority']} {r['name']} "
            f"({r['category']}, stage {r['stage']}, {r['difficulty']}) "
            f"— ${r['price_min']:,.0f}-${r['price_max']:,.0f}"
        )
        lines.append(f"    {r['description']}")
        for w in r.get("warnings") or []:
            lines.append(f"    ⚠ {w}")
        if r.get("brand_tips"):
            lines.append(f"    Brands: {', '.join(r['brand_tips'])}")
    return "\n".join(lines)


def run():
    if not settings.anthropic_api_key:
        print("ANTHROPIC_API_KEY is not set in the environment — can't make real model calls.", file=sys.stderr)
        sys.exit(1)

    results = []
    for i, vehicle in enumerate(VEHICLES, 1):
        label = f"{vehicle['year']} {vehicle['make']} {vehicle['model']}"
        print(f"[{i}/{len(VEHICLES)}] {label} — product engine...", flush=True)
        product_text = product_call(vehicle)
        print(f"[{i}/{len(VEHICLES)}] {label} — bare {MODEL}...", flush=True)
        bare_text = bare_model_call(vehicle)

        # Randomize A/B per vehicle so a human can't infer "left is always
        # the product" by the third example — that's the actual blinding.
        sides = [("product", product_text), ("bare_model", bare_text)]
        random.shuffle(sides)
        results.append({
            "vehicle": label,
            "context": vehicle,
            "a_source": sides[0][0], "a_text": sides[0][1],
            "b_source": sides[1][0], "b_text": sides[1][1],
        })
        time.sleep(1)

    OUTPUT_DIR.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    json_path = OUTPUT_DIR / f"blind_compare_{stamp}.json"
    html_path = OUTPUT_DIR / f"blind_compare_{stamp}.html"
    json_path.write_text(json.dumps(results, indent=2))
    html_path.write_text(render_html(results))

    print(f"\nWrote {json_path}")
    print(f"Wrote {html_path}")
    return html_path


def render_html(results: list[dict]) -> str:
    esc = html.escape
    pairs_html = []
    for i, r in enumerate(results, 1):
        ctx = r["context"]
        pairs_html.append(f"""
        <section class="pair">
          <div class="pair-head">
            <span class="pair-num">{i:02d}</span>
            <h2>{esc(r['vehicle'])}</h2>
            <span class="pair-meta">${ctx['budget']:,.0f} &middot; {esc(ctx['goal'])} &middot; {esc(ctx['experience'])}</span>
          </div>
          <div class="columns">
            <div class="col">
              <div class="col-label">Response A</div>
              <pre>{esc(r['a_text'])}</pre>
            </div>
            <div class="col">
              <div class="col-label">Response B</div>
              <pre>{esc(r['b_text'])}</pre>
            </div>
          </div>
          <details class="reveal">
            <summary>Reveal source (read both first)</summary>
            <p>A = <strong>{esc(r['a_source'])}</strong> &nbsp;&middot;&nbsp; B = <strong>{esc(r['b_source'])}</strong></p>
          </details>
        </section>""")

    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Blind comparison — product engine vs. bare model</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{
    background: #0a0a0a; color: #e7e4dd; margin: 0;
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    line-height: 1.55;
  }}
  .wrap {{ max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 6rem; }}
  h1 {{ font-size: 1.4rem; margin: 0 0 0.5rem; }}
  .intro {{ color: #9a978f; font-size: 0.85rem; max-width: 680px; margin-bottom: 3rem; }}
  .pair {{ border: 1px solid rgba(231,228,221,0.1); margin-bottom: 2rem; padding: 1.5rem; }}
  .pair-head {{ display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem; }}
  .pair-num {{ color: #6f6c62; font-size: 0.85rem; }}
  .pair-head h2 {{ font-size: 1.05rem; margin: 0; font-family: Georgia, serif; }}
  .pair-meta {{ color: #9a978f; font-size: 0.78rem; }}
  .columns {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }}
  @media (max-width: 760px) {{ .columns {{ grid-template-columns: 1fr; }} }}
  .col-label {{ font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6f6c62; margin-bottom: 0.6rem; }}
  pre {{ white-space: pre-wrap; word-wrap: break-word; font-size: 0.82rem; background: #131313; border: 1px solid rgba(231,228,221,0.07); padding: 1rem; margin: 0; max-height: 480px; overflow-y: auto; }}
  details.reveal {{ margin-top: 1rem; font-size: 0.8rem; }}
  details.reveal summary {{ cursor: pointer; color: #7c8db5; }}
  details.reveal p {{ color: #9a978f; margin: 0.5rem 0 0; }}
</style>
</head>
<body>
  <div class="wrap">
    <h1>Blind comparison — product recommendation engine vs. bare model</h1>
    <p class="intro">
      10 real vehicles, same prompt content, same underlying model
      ({esc(MODEL)}) on both sides. One column per pair is CarMods AI's real
      recommendation engine; the other is a bare call to the same model with
      no product-specific prompting — a plain question, like you'd type into
      ChatGPT. Which is which is hidden per pair and was randomized
      independently, so it's not always the same side. Read both, form an
      opinion, then use "Reveal source" to check yourself.
    </p>
    {''.join(pairs_html)}
  </div>
</body>
</html>"""


if __name__ == "__main__":
    run()
