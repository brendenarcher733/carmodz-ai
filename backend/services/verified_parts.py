"""
services/verified_parts.py

Curated, community-verified aftermarket parts for supported platforms.

Each platform entry is keyed by (normalized_make, normalized_model) and contains:
  - "rules": list of platform-specific prompt instructions (drivetrain facts, priority
    rules, mandatory line items). These are injected verbatim into the LLM prompt and
    must only assert facts that are true for THIS platform — never generic boilerplate.
  - one key per goal category (e.g. "handling") mapping to a list of verified part dicts.

To add a new platform: add a new key to VERIFIED_PARTS with its own rules and parts.
No other changes needed — prompt injection and fitment override in ai_service.py read
this dict automatically.
"""

from __future__ import annotations

VERIFIED_PARTS: dict[tuple[str, str], dict] = {

    ("honda", "civic si"): {
        "min_year": 2022,
        "max_year": None,   # None means open-ended

        # Platform-specific rules injected into the LLM prompt.
        # Only assert facts that are true for the 2022–2025 Civic Si (FE1):
        # FWD, handling-biased, factory understeer, OEM sway bar is 18mm rear.
        "rules": [
            "Tires go first (priority 1) — the highest single-impact handling upgrade on this platform.",
            "Do NOT recommend a front sway bar. The FE1 is FWD; stiffening the rear corrects understeer. A front sway bar is difficult to install and negatively affects handling on this car.",
            "Include Professional Alignment as a mandatory line item whenever recommending sway bars, springs, or coilovers.",
            "Only recommend lowering springs or coilovers if budget allows after tires and sway bar.",
        ],

        "handling": [

            # ── Tier 1: Tires ─────────────────────────────────────────────
            {
                "name": "Michelin Pilot Sport AS4",
                "category": "handling",
                "stage": 1,
                "priority": 1,
                "price_min": 700,
                "price_max": 900,
                "difficulty": "easy",
                "why": "The stock Goodyears are the Si's biggest handling limiter. AS4 is the community gold standard for all-season performance.",
                "impact": "Significantly more grip in wet and dry without touching suspension.",
                "compatibility_note": "235/40R18 fits all 2022–2025 Civic Si (FE1) on stock wheels.",
                "tradeoff": "All-season, not summer-only; choose PS4S for maximum dry grip.",
                "suggested_search_terms": ["Michelin Pilot Sport AS4 235/40R18", "PS AS4 Civic Si"],
                "fitment_note": "Confirmed OEM size 235/40R18 for 2022–2025 Civic Si FE1.",
                "exclude_if_budget_below": None,
            },
            {
                "name": "Continental ExtremeContact DWS06+",
                "category": "handling",
                "stage": 1,
                "priority": 1,
                "price_min": 550,
                "price_max": 700,
                "difficulty": "easy",
                "why": "Close second to the Pilot Sport AS4 in performance, significantly cheaper — the value pick for all-season grip.",
                "impact": "Strong wet and dry grip improvement over stock Goodyears.",
                "compatibility_note": "235/40R18 fits all 2022–2025 Civic Si (FE1) on stock wheels.",
                "tradeoff": "Marginally behind Michelin in wet and snow performance.",
                "suggested_search_terms": ["Continental ExtremeContact DWS06+ 235/40R18", "DWS06 Civic Si"],
                "fitment_note": "Confirmed OEM size 235/40R18 for 2022–2025 Civic Si FE1.",
                "exclude_if_budget_below": None,
            },
            {
                "name": "Michelin Pilot Sport 4S",
                "category": "handling",
                "stage": 1,
                "priority": 1,
                "price_min": 900,
                "price_max": 1100,
                "difficulty": "easy",
                "why": "Best summer tire for the Si — maximum dry and wet grip for canyon and track use.",
                "impact": "Top-tier dry grip and steering feel; noticeably sharper than stock.",
                "compatibility_note": "Summer only — not suitable below 7°C (45°F) or in snow.",
                "tradeoff": "Summer compound only; needs a separate winter set in cold climates.",
                "suggested_search_terms": ["Michelin Pilot Sport 4S 235/40R18", "PS4S Civic Si"],
                "fitment_note": "Confirmed OEM size 235/40R18 for 2022–2025 Civic Si FE1.",
                "exclude_if_budget_below": None,
            },

            # ── Tier 2: Rear sway bar ─────────────────────────────────────
            {
                "name": "Whiteline 22mm Rear Sway Bar",
                "category": "handling",
                "stage": 1,
                "priority": 2,
                "price_min": 150,
                "price_max": 220,
                "difficulty": "medium",
                "why": "Most widely installed handling mod on the FE1. Reduces body roll and kills the factory understeer bias.",
                "impact": "Noticeably more neutral cornering balance and sharper turn-in.",
                "compatibility_note": "Direct bolt-on for 2022–2025 Civic Si FE1. Upgrade to Accord aluminum end links (OEM 52320-TLB-A00) over stock plastic.",
                "tradeoff": "Slightly stiffer rear feel on rough roads at the stiffest setting.",
                "suggested_search_terms": ["Whiteline BHR97Z rear sway bar Civic", "Whiteline 22mm sway bar FE1"],
                "fitment_note": "Part BHR97Z. Confirmed direct fit 2022–2025 Civic Si FE1.",
                "exclude_if_budget_below": None,
            },
            {
                "name": "RV6 Adjustable Rear Sway Bar",
                "category": "handling",
                "stage": 2,
                "priority": 2,
                "price_min": 229,
                "price_max": 280,
                "difficulty": "medium",
                "why": "Track-focused 6-way adjustable chromoly bar — same spec as the HPD FK8 road race car.",
                "impact": "More tunable than Whiteline; fine-tune rotation for autocross or canyon driving.",
                "compatibility_note": "Confirmed fit 2022+ Civic Si FE1. Includes billet end links.",
                "tradeoff": "More expensive than Whiteline; tuneability only matters if you will adjust it.",
                "suggested_search_terms": ["RV6 adjustable rear sway bar Civic Si", "RV6 FK8 rear sway bar"],
                "fitment_note": "SKU FK8_REAR_SWAYBAR. Confirmed fit 2022+ Civic Si FE1.",
                "exclude_if_budget_below": 1000,
            },

            # ── Tier 3: Alignment ─────────────────────────────────────────
            {
                "name": "Professional Alignment",
                "category": "handling",
                "stage": 1,
                "priority": 3,
                "price_min": 100,
                "price_max": 150,
                "difficulty": "easy",
                "why": "Required after any sway bar or spring installation. Misalignment destroys tire wear and undoes every handling improvement.",
                "impact": "Correct camber and toe restores steering feel and maximizes tire contact patch.",
                "compatibility_note": "",
                "tradeoff": "",
                "suggested_search_terms": ["wheel alignment Honda Civic Si", "4-wheel alignment shop"],
                "fitment_note": "Mandatory line item whenever recommending sway bars, springs, or coilovers.",
                "exclude_if_budget_below": None,
            },
            {
                "name": "SPC Rear Camber Arms",
                "category": "handling",
                "stage": 2,
                "priority": 3,
                "price_min": 150,
                "price_max": 220,
                "difficulty": "medium",
                "why": "Required for proper alignment after lowering. Used on the official HPD Si race car.",
                "impact": "Restores rear camber to spec after lowering, preventing uneven tire wear.",
                "compatibility_note": "Confirmed fit 2022+ Civic Si FE1. Required when running lowering springs or coilovers.",
                "tradeoff": "Only needed if lowering the car; not required for sway bar-only builds.",
                "suggested_search_terms": ["SPC rear camber arms Civic Si", "SPC 67476 camber kit"],
                "fitment_note": "SKU 67476. Confirmed fit 2022+ Civic Si FE1.",
                "exclude_if_budget_below": 1500,
            },

            # ── Tier 4: Springs / Coilovers ───────────────────────────────
            {
                "name": "Eibach Pro-Kit Lowering Springs",
                "category": "handling",
                "stage": 2,
                "priority": 4,
                "price_min": 250,
                "price_max": 310,
                "difficulty": "medium",
                "why": "1.2\" front / 1.0\" rear drop on FE1 — Eibach's balanced daily-sport tune, tested on factory dampers.",
                "impact": "Lower center of gravity and reduced body roll with stock shocks.",
                "compatibility_note": "Part E10-40-043-02-22. Confirmed 2022+ Civic Si FE1. Rear camber arms required for alignment.",
                "tradeoff": "Firmer ride than stock. Camber arms needed after install.",
                "suggested_search_terms": ["Eibach Pro-Kit E10-40-043-02-22 Civic Si", "Eibach lowering springs FE1"],
                "fitment_note": "Part E10-40-043-02-22. Confirmed 2022+ Civic Si FE1.",
                "exclude_if_budget_below": 1200,
            },
            {
                "name": "Swift Spec R Lowering Springs",
                "category": "handling",
                "stage": 2,
                "priority": 4,
                "price_min": 280,
                "price_max": 340,
                "difficulty": "medium",
                "why": "Designed specifically for 2022+ FE1 with near-OEM spring rates — daily-driveable drop.",
                "impact": "1\" drop all around with progressive rates that maintain comfort on rough roads.",
                "compatibility_note": "Part 4H923R. Designed specifically for 2022+ Civic Si FE1.",
                "tradeoff": "Softer spring rates than track-oriented options.",
                "suggested_search_terms": ["Swift Spec R 4H923R Civic Si springs", "Swift springs FE1"],
                "fitment_note": "Part 4H923R. Designed specifically for 2022+ Civic Si FE1.",
                "exclude_if_budget_below": 1200,
            },
            {
                "name": "Silvers NEOMAX Coilovers",
                "category": "handling",
                "stage": 3,
                "priority": 5,
                "price_min": 1299,
                "price_max": 1400,
                "difficulty": "medium",
                "why": "Most recommended coilover for the 11th gen Si — hand-assembled, 18-month warranty, genuine damping adjustment.",
                "impact": "Full height and damping adjustment; transforms handling for canyon and autocross.",
                "compatibility_note": "Part SH1072. Confirmed fit 2022–2025 Civic Si FE1. Professional alignment required after install.",
                "tradeoff": "Firmer daily ride than stock; 8k/8k spring rates are on the stiffer side.",
                "suggested_search_terms": ["Silvers NEOMAX SH1072 Civic Si", "Silvers coilovers FE1"],
                "fitment_note": "Part SH1072. Confirmed fit 2022–2025 Honda Civic Si FE1.",
                "exclude_if_budget_below": 1500,
            },
            {
                "name": "BC Racing BR Series Coilovers",
                "category": "handling",
                "stage": 3,
                "priority": 5,
                "price_min": 800,
                "price_max": 950,
                "difficulty": "medium",
                "why": "30-way damping adjustment at a lower price point than Silvers — good daily-sport balance on the FE1.",
                "impact": "Height and damping adjustable; noticeably sharper handling than stock springs.",
                "compatibility_note": "Part A-162-BR. Confirmed fit 2022–2026 Civic Si FE1. Professional alignment required.",
                "tradeoff": "Twin-tube design; Silvers outperforms at similar prices for track use.",
                "suggested_search_terms": ["BC Racing BR A-162-BR Civic Si", "BC Racing coilovers FE1"],
                "fitment_note": "Part A-162-BR. Confirmed fit 2022–2026 Honda Civic Si FE1.",
                "exclude_if_budget_below": 1500,
            },
        ],
    },
}


# ── Lookup helpers ─────────────────────────────────────────────────────────────

def _year_in_range(platform: dict, year: int | None) -> bool:
    """Return False if year is outside this platform's verified range."""
    if year is None:
        return True  # caller didn't supply a year; don't filter
    min_y = platform.get("min_year")
    max_y = platform.get("max_year")
    if min_y is not None and year < min_y:
        return False
    if max_y is not None and year > max_y:
        return False
    return True


def get_verified_parts(
    make: str, model: str, categories: list[str],
    budget: float | None = None, year: int | None = None
) -> list[dict]:
    """Return verified parts for a platform + category combination.
    make/model should be normalized (lowercase, stripped).
    Parts with exclude_if_budget_below are dropped when budget is below that value.
    """
    key = (make.lower().strip(), model.lower().strip())
    platform = VERIFIED_PARTS.get(key, {})
    if not _year_in_range(platform, year):
        return []
    result: list[dict] = []
    for cat in categories:
        for part in platform.get(cat, []):
            threshold = part.get("exclude_if_budget_below")
            if budget is not None and threshold and budget < threshold:
                continue
            result.append(part)
    return result


def get_platform_rules(make: str, model: str, year: int | None = None) -> list[str]:
    """Return platform-specific prompt rules for this make/model, or empty list.
    Rules are only asserted when they come from the catalog entry for this exact
    platform — never generated generically.
    """
    key = (make.lower().strip(), model.lower().strip())
    platform = VERIFIED_PARTS.get(key, {})
    if not _year_in_range(platform, year):
        return []
    return platform.get("rules", [])


def is_verified_part(
    name: str, make: str, model: str, year: int | None = None
) -> tuple[bool, dict | None]:
    """Check whether a part name matches a verified part for this platform.
    Returns (True, part_dict) on match, (False, None) otherwise.
    Case-insensitive exact match on name.
    """
    key = (make.lower().strip(), model.lower().strip())
    platform = VERIFIED_PARTS.get(key, {})
    if not _year_in_range(platform, year):
        return False, None
    name_lower = name.lower().strip()
    for key_cat, parts in platform.items():
        if key_cat in ("rules", "min_year", "max_year"):
            continue
        for part in parts:
            if part["name"].lower().strip() == name_lower:
                return True, part
    return False, None


def has_verified_parts(
    make: str, model: str, categories: list[str], year: int | None = None
) -> bool:
    """Return True if a verified list exists for this platform + any of these categories."""
    key = (make.lower().strip(), model.lower().strip())
    platform = VERIFIED_PARTS.get(key, {})
    if not _year_in_range(platform, year):
        return False
    return any(cat in platform for cat in categories)
