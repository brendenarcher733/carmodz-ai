# services/mock_ai.py
# Mock AI service — realistic, knowledge-rich car mod advisor.
# Swap for OpenAI/Anthropic by changing AI_PROVIDER in .env
# The interface (generate_recommendations, chat_response) stays identical.

from models.build import BuildCreate
from models.recommendation import ModRecommendation, ModPlan
import random

# ── Mod Knowledge Base ─────────────────────────────────────────────────────────
# Structured by category → goal affinity → specs

MOD_LIBRARY = {
    "performance": [
        {
            "name": "Cold Air Intake",
            "description": "Replaces the restrictive factory air box with a free-flowing intake path. Drops intake temps, increases airflow, and gives you that satisfying induction sound at full throttle. One of the best bang-for-buck mods on any platform.",
            "price_min": 150, "price_max": 400,
            "difficulty": "easy", "stage": 1, "priority": 2,
            "goals": ["performance", "sound", "budget performance"],
            "brand_tips": ["K&N", "AEM", "Injen", "Mishimoto"],
            "warnings": []
        },
        {
            "name": "Cat-Back Exhaust System",
            "description": "Full exhaust replacement from the catalytic converter back. Reduces backpressure, adds real power gains (10–20whp on NA, more on boosted), and transforms the exhaust note from stock boring to something that actually sounds like it means business.",
            "price_min": 400, "price_max": 1400,
            "difficulty": "medium", "stage": 1, "priority": 3,
            "goals": ["performance", "sound", "street performance"],
            "brand_tips": ["Borla", "MagnaFlow", "Flowmaster", "ARK", "HKS"],
            "warnings": ["May void emissions inspection in some states"]
        },
        {
            "name": "ECU Tune / Flash",
            "description": "The highest power-per-dollar mod on any modern car. A professional tune reoptimizes fuel maps, ignition timing, and boost targets for your exact setup. Do this AFTER supporting mods are in — intake + exhaust + intercooler first.",
            "price_min": 400, "price_max": 900,
            "difficulty": "easy", "stage": 2, "priority": 1,
            "goals": ["performance", "track", "max power"],
            "brand_tips": ["Cobb Accessport", "Unitronic", "APR", "MHD", "EcuTek"],
            "warnings": [
                "Requires reputable tuner — bad tune = engine damage",
                "May void factory warranty",
                "Best results require intake + exhaust done first"
            ]
        },
        {
            "name": "Intercooler Upgrade",
            "description": "For turbocharged cars only. The stock intercooler is always the limiting factor. A larger, more efficient core drops charge temps significantly, reducing knock and allowing more aggressive timing. Essential before pushing above stock boost.",
            "price_min": 500, "price_max": 1600,
            "difficulty": "medium", "stage": 2, "priority": 2,
            "goals": ["performance", "track", "max power"],
            "brand_tips": ["Mishimoto", "Forge", "Wagner Tuning", "Process West"],
            "warnings": ["Turbocharged engines only", "Budget for install labor if not DIY"]
        },
        {
            "name": "High-Flow Catalytic Converter",
            "description": "Reduces exhaust restriction while maintaining emissions compliance. A direct bolt-on replacement that pairs perfectly with an aftermarket exhaust to unlock meaningful flow improvements, especially on forced induction cars.",
            "price_min": 200, "price_max": 600,
            "difficulty": "medium", "stage": 2, "priority": 4,
            "goals": ["performance", "track"],
            "brand_tips": ["Random Technology", "MagnaFlow Sport Cat"],
            "warnings": ["Check local emissions laws before purchasing"]
        },
        {
            "name": "Downpipe Upgrade",
            "description": "The single most impactful exhaust mod on any turbocharged car. Replaces the extremely restrictive OEM turbine outlet. Combined with a tune, expect 40–80whp on most platforms. Night-and-day difference.",
            "price_min": 300, "price_max": 900,
            "difficulty": "hard", "stage": 2, "priority": 1,
            "goals": ["performance", "track", "max power"],
            "brand_tips": ["ETS", "CTS Turbo", "Invidia", "Tomei"],
            "warnings": ["Turbocharged only", "Catless versions will trigger CEL", "Requires tune after install"]
        },
        {
            "name": "Short Ram / Performance Intake",
            "description": "Budget-friendly airflow improvement. Not as effective as a proper cold air intake in all conditions, but a legitimate first step for tight engine bays or budget-constrained builds.",
            "price_min": 60, "price_max": 180,
            "difficulty": "easy", "stage": 1, "priority": 5,
            "goals": ["budget performance", "beginner"],
            "brand_tips": ["K&N", "Takeda", "aFe"],
            "warnings": ["Heat soak can reduce gains in traffic"]
        },
    ],
    "handling": [
        {
            "name": "Coilover Suspension",
            "description": "The single best chassis upgrade for any enthusiast build. Fully adjustable ride height, damping, and spring rate. Transforms both the look and the feel — sharper turn-in, reduced body roll, and you can actually dial in exactly what you want.",
            "price_min": 700, "price_max": 2800,
            "difficulty": "medium", "stage": 1, "priority": 1,
            "goals": ["handling", "track", "street performance"],
            "brand_tips": ["KW", "BC Racing", "Fortune Auto", "Öhlins", "Tein"],
            "warnings": ["Very cheap coilovers can degrade quickly", "Alignment required after install ($100–180)"]
        },
        {
            "name": "Sway Bar Upgrade",
            "description": "Dramatically reduces body roll without sacrificing ride quality like springs alone. Front and rear upgraded bars transform how the car rotates through corners. One of the best handling-per-dollar mods available.",
            "price_min": 150, "price_max": 500,
            "difficulty": "medium", "stage": 1, "priority": 2,
            "goals": ["handling", "track"],
            "brand_tips": ["Whiteline", "Eibach", "Hotchkis"],
            "warnings": []
        },
        {
            "name": "Performance Brake Pads",
            "description": "Upgraded pads reduce fade under repeated hard stops and improve initial bite. Mandatory before track days. Upgrade fluid at the same time — stock brake fluid boils under sustained use.",
            "price_min": 80, "price_max": 220,
            "difficulty": "easy", "stage": 1, "priority": 1,
            "goals": ["track", "safety", "handling"],
            "brand_tips": ["StopTech", "Hawk", "EBC Brakes", "Ferodo"],
            "warnings": ["Performance pads can be noisy for street use", "Upgrade brake fluid to DOT 4 or 5.1 simultaneously"]
        },
        {
            "name": "Big Brake Kit",
            "description": "Larger rotors and multi-piston calipers for serious braking performance. Overkill for street builds but essential for track cars running sticky tires. Also looks incredible through the wheels.",
            "price_min": 1200, "price_max": 3500,
            "difficulty": "hard", "stage": 3, "priority": 3,
            "goals": ["track", "max performance"],
            "brand_tips": ["StopTech", "Brembo", "AP Racing", "Wilwood"],
            "warnings": ["Verify wheel clearance before ordering", "Budget for rotors + pads + fluid", "Professional install strongly recommended"]
        },
        {
            "name": "Lowering Springs",
            "description": "Budget alternative to coilovers. Drops the car 1–1.5 inches for improved stance and center of gravity. Non-adjustable but dramatically cheaper than a full coilover setup.",
            "price_min": 150, "price_max": 400,
            "difficulty": "medium", "stage": 1, "priority": 3,
            "goals": ["budget handling", "cosmetic", "street"],
            "brand_tips": ["Eibach Pro-Kit", "H&R", "Tein S-Tech"],
            "warnings": ["Alignment required after install", "Not adjustable — verify drop height before buying", "Can cause suspension binding on some platforms"]
        },
        {
            "name": "Strut Tower Brace",
            "description": "Stiffens the front end of the chassis by connecting both strut towers. Reduces flex under hard cornering for sharper, more predictable response. Easy first handling mod that makes a real difference on older chassis.",
            "price_min": 60, "price_max": 200,
            "difficulty": "easy", "stage": 1, "priority": 4,
            "goals": ["handling", "track", "budget"],
            "brand_tips": ["Cusco", "Megan Racing", "AEM"],
            "warnings": []
        },
    ],
    "cosmetic": [
        {
            "name": "Aftermarket Wheels",
            "description": "The single highest-impact cosmetic upgrade. The right set completely transforms the car's presence. Prioritize lightweight options — reducing unsprung weight actually improves handling too.",
            "price_min": 800, "price_max": 3000,
            "difficulty": "easy", "stage": 1, "priority": 1,
            "goals": ["cosmetic", "stance", "show"],
            "brand_tips": ["Work Wheels", "Enkei", "Volk Racing", "Rays", "BBS", "Konig"],
            "warnings": ["Check offset and fitment carefully", "Stick within 3% of OEM tire diameter for accurate speedo"]
        },
        {
            "name": "Window Tint",
            "description": "Ceramic tint blocks 50%+ of heat, reduces glare, protects the interior, and instantly makes any car look cleaner. One of the best quality-of-life mods per dollar spent.",
            "price_min": 180, "price_max": 500,
            "difficulty": "easy", "stage": 1, "priority": 2,
            "goals": ["cosmetic", "daily driver", "budget"],
            "brand_tips": ["Llumar", "3M", "SunTek", "XPEL"],
            "warnings": ["Check state tint laws before choosing VLT percentage"]
        },
        {
            "name": "Splitter / Front Lip",
            "description": "Aggressive front lip or full splitter adds visual aggression and minor aerodynamic effect. Carbon fiber versions add authenticity. Careful with aggressive lips on cars you actually drive daily.",
            "price_min": 80, "price_max": 600,
            "difficulty": "easy", "stage": 1, "priority": 3,
            "goals": ["cosmetic", "stance", "street performance"],
            "brand_tips": ["Verus Engineering", "APR Performance", "Seibon"],
            "warnings": ["Aggressive splitters scrape easily on daily drivers", "Carbon fiber versions need protection film"]
        },
        {
            "name": "Vinyl Wrap",
            "description": "Full or partial vehicle wrap in any color or finish. Protects factory paint, fully reversible, and dramatically changes the car's look without committing to permanent paint.",
            "price_min": 1500, "price_max": 4000,
            "difficulty": "hard", "stage": 2, "priority": 4,
            "goals": ["cosmetic", "show", "unique build"],
            "brand_tips": ["3M", "Avery Dennison", "KPMF"],
            "warnings": ["DIY wraps look DIY unless you're very skilled", "Professional install recommended for full car"]
        },
        {
            "name": "Exterior LED Lighting Upgrade",
            "description": "DRL, sequential turn signals, underglow, or interior LED upgrades. Massive visual impact for minimal cost. Modern cars look significantly more premium with proper lighting.",
            "price_min": 50, "price_max": 400,
            "difficulty": "easy", "stage": 1, "priority": 5,
            "goals": ["cosmetic", "budget", "show"],
            "brand_tips": ["Morimoto", "Diode Dynamics", "Oracle"],
            "warnings": ["Check local laws on underglow", "Avoid cheap eBay LEDs — they fail quickly"]
        },
    ],
    "sound": [
        {
            "name": "Axle-Back Exhaust",
            "description": "Budget-friendly exhaust upgrade. Replaces just the muffler section, so it's the least restrictive mod for sound but gets you real tone improvement without touching the full system.",
            "price_min": 200, "price_max": 700,
            "difficulty": "easy", "stage": 1, "priority": 2,
            "goals": ["sound", "budget", "daily driver"],
            "brand_tips": ["Borla", "Flowmaster", "Magnaflow", "Corsa"],
            "warnings": ["Less power gain than cat-back", "May drone at highway speeds depending on design"]
        },
        {
            "name": "Intake Sound Enhancer / Pod Filter",
            "description": "Direct-fit or universal induction kit that dramatically increases intake sound under load. Not just for show — freer breathing means real airflow improvements.",
            "price_min": 50, "price_max": 200,
            "difficulty": "easy", "stage": 1, "priority": 3,
            "goals": ["sound", "budget", "beginner"],
            "brand_tips": ["K&N", "Takeda"],
            "warnings": ["Heat soak possible without proper shielding"]
        },
        {
            "name": "Blow-Off Valve / Bypass Valve",
            "description": "The iconic turbo flutter / whoosh sound. BOV vents pressure between shifts on turbocharged cars. Recirculating versions (bypass valves) are safer for MAF-equipped engines.",
            "price_min": 120, "price_max": 400,
            "difficulty": "medium", "stage": 1, "priority": 2,
            "goals": ["sound", "turbo build", "street performance"],
            "brand_tips": ["Turbosmart", "Forge", "Tial", "HKS"],
            "warnings": ["Turbocharged cars ONLY", "Atmospheric BOVs can cause rough idle on MAF cars", "Get the right flange size for your turbo"]
        },
        {
            "name": "Sound System Upgrade",
            "description": "Head unit, component speakers, subwoofer, and amplifier upgrade. Night and day difference over factory audio. Especially worth it on long highway drives.",
            "price_min": 300, "price_max": 2000,
            "difficulty": "medium", "stage": 1, "priority": 4,
            "goals": ["sound", "comfort", "daily driver"],
            "brand_tips": ["Alpine", "JL Audio", "Focal", "Kenwood"],
            "warnings": ["Professional install recommended for complex setups", "Add deadening foam to reduce road noise first"]
        },
    ],
    "reliability": [
        {
            "name": "Cooling System Overhaul",
            "description": "Thermostat, coolant flush, hoses, and possibly a radiator upgrade. Prevents overheating that destroys engines. Non-negotiable maintenance on any high-mileage build before adding power.",
            "price_min": 150, "price_max": 600,
            "difficulty": "medium", "stage": 1, "priority": 1,
            "goals": ["reliability", "maintenance", "high mileage"],
            "brand_tips": ["Mishimoto", "Gates", "OEM+"],
            "warnings": ["Don't skip this if planning power mods", "Replace cap and overflow tank if old"]
        },
        {
            "name": "Spark Plugs & Ignition Coils",
            "description": "Fresh plugs and coils are mandatory before any tune. Old plugs misfire under boost/high load and destroy power and efficiency. Iridium or NGK plugs gapped correctly make a real difference.",
            "price_min": 60, "price_max": 250,
            "difficulty": "easy", "stage": 1, "priority": 1,
            "goals": ["reliability", "maintenance", "pre-tune prep"],
            "brand_tips": ["NGK", "Denso", "Bosch Iridium"],
            "warnings": ["Check OEM gap spec for your platform", "Don't overtighten — ceramic is fragile"]
        },
        {
            "name": "Oil Catch Can",
            "description": "Intercepts crankcase blow-by gases before they reenter the intake. Prevents carbon buildup on intake valves (critical on direct injection engines). Simple install, pays for itself in prevented maintenance.",
            "price_min": 60, "price_max": 250,
            "difficulty": "easy", "stage": 1, "priority": 2,
            "goals": ["reliability", "maintenance", "daily driver"],
            "brand_tips": ["Mishimoto", "Radium Engineering", "Peterson"],
            "warnings": ["Must be emptied regularly", "Essential on direct injection engines (GDI, TFSI, N20, etc.)"]
        },
        {
            "name": "Upgraded Intercooler Hoses",
            "description": "Stock silicone or rubber charge pipe couplers blow off under pressure. Reinforced hoses prevent boost leaks that kill power and cause confusing diagnostics.",
            "price_min": 80, "price_max": 300,
            "difficulty": "easy", "stage": 1, "priority": 3,
            "goals": ["reliability", "turbo build"],
            "brand_tips": ["Mishimoto", "CTS Turbo", "Samco"],
            "warnings": ["Turbocharged cars only"]
        },
        {
            "name": "Short Throw Shifter",
            "description": "Reduces shift throw by 30–50% for a more direct, connected feel. Transforms driving experience on manual cars. One of the best feel-per-dollar mods for MT vehicles.",
            "price_min": 80, "price_max": 300,
            "difficulty": "easy", "stage": 1, "priority": 3,
            "goals": ["reliability", "manual transmission", "daily driver"],
            "brand_tips": ["B&M", "Skunk2", "Mishimoto", "Raceseng"],
            "warnings": ["Manual transmission vehicles only"]
        },
    ],
    "interior": [
        {
            "name": "Sport Steering Wheel",
            "description": "Smaller diameter, thicker grip sport wheel transforms driver feel and cockpit aesthetics. Flat-bottom designs look aggressive and improve knee clearance.",
            "price_min": 200, "price_max": 800,
            "difficulty": "medium", "stage": 1, "priority": 3,
            "goals": ["interior", "track", "aesthetic"],
            "brand_tips": ["Momo", "Nardi", "OMP", "Sparco", "NRG"],
            "warnings": ["Airbag-equipped cars require hub adapter", "Removing airbag is illegal in some states"]
        },
        {
            "name": "Bucket Seats",
            "description": "Fixed-back or reclining sport seats provide lateral support flat factory seats can't offer. Essential for track days where you need to stay planted under lateral loads.",
            "price_min": 300, "price_max": 2000,
            "difficulty": "medium", "stage": 2, "priority": 3,
            "goals": ["interior", "track", "aesthetic"],
            "brand_tips": ["Bride", "Recaro", "Sparco", "OMP", "Corbeau"],
            "warnings": ["Requires seat rails specific to your car", "Fixed-back seats not comfortable for long daily commutes"]
        },
        {
            "name": "Roll Bar / Harness Bar",
            "description": "Safety-first interior upgrade. A bolt-in harness bar lets you run a 4- or 5-point harness without a full cage. Essential for track/autocross cars.",
            "price_min": 250, "price_max": 800,
            "difficulty": "medium", "stage": 2, "priority": 1,
            "goals": ["track", "safety", "interior"],
            "brand_tips": ["Sparco", "NRG", "Cusco"],
            "warnings": ["Do NOT run harness without a proper roll bar or cage", "Professional weld-in options are safer than bolt-in for track use"]
        },
    ]
}


# ── Chat Knowledge Base ────────────────────────────────────────────────────────

CHAT_CONTEXT = {
    "greetings": [
        "What's up! I'm your Mod Advisor. Tell me about your build — what car are you working with and what are you trying to accomplish?",
        "Hey, let's talk mods. What are you building and what's your budget situation?",
    ],
    "budget_low": [
        "Real talk — ${budget} is tight for what you're describing. Let me show you what we can do smart with that.",
        "With ${budget}, we need to prioritize. The good news is there's a real playbook for budget builds that actually work.",
    ],
    "budget_questions": [
        "Is that budget just for parts, or are you including labor? Labor can double the cost on complex installs.",
        "Are you doing the installs yourself or paying a shop? That changes the math significantly.",
        "Is this budget for one phase, or your total build budget? I want to make sure we don't blow it all in Stage 1.",
    ],
    "experience_follow_ups": {
        "beginner": "Since you're newer to modding, I'll focus on easy installs with good YouTube support and avoid anything that can hurt the engine if done wrong.",
        "intermediate": "You've got some experience, so I can recommend mods that need some mechanical skill but aren't out of reach.",
        "advanced": "You know what you're doing, so I'll give you the full picture including Stage 3 mods and performance options that need a tune.",
    },
    "goal_follow_ups": {
        "performance": "For performance, the order matters: intake → exhaust → intercooler (if turbo) → tune. Don't tune before supporting mods are in place.",
        "sound": "Sound mods are some of the most fun per dollar. We can get you a completely transformed exhaust note without spending a fortune.",
        "handling": "Handling is where most builds are underinvested. People spend on power and ignore how the car actually drives. Let's fix that.",
        "reliability": "Smart. Build on a solid foundation. No point adding power to a car that's one overheating event from a head gasket.",
        "cosmetic": "Cosmetic mods have the highest visual impact per dollar if you pick right. Wheels + tint + lowering = completely different car.",
        "track": "Track builds need a different mindset — safety and chassis before power. What does your intended track use look like?",
    }
}


# ── Service Functions ─────────────────────────────────────────────────────────

def _score_mod(mod: dict, build: BuildCreate) -> float:
    """Score a mod's relevance to the build (higher = more relevant)."""
    score = 0.0
    goal_lower = build.goal.lower()
    cats_lower = [c.lower() for c in build.categories]

    # Goal match
    for g in mod.get("goals", []):
        if g.lower() in goal_lower or any(g.lower() in c for c in cats_lower):
            score += 2.0
        elif goal_lower in g.lower():
            score += 1.0

    # Budget fit — penalize mods that eat too much budget
    mod_avg = (mod["price_min"] + mod["price_max"]) / 2
    budget_ratio = mod_avg / build.budget
    if budget_ratio < 0.15:
        score += 1.5   # affordable
    elif budget_ratio < 0.30:
        score += 1.0   # reasonable
    elif budget_ratio > 0.60:
        score -= 1.0   # too expensive

    # Experience fit
    if build.experience == "beginner" and mod["difficulty"] == "easy":
        score += 1.0
    elif build.experience == "beginner" and mod["difficulty"] == "hard":
        score -= 2.0
    elif build.experience == "advanced":
        score += 0.5   # advanced users can do anything

    # Daily driver consideration
    if build.is_daily and mod.get("warnings"):
        score -= 0.5

    return score


def generate_recommendations(build: BuildCreate) -> list[ModRecommendation]:
    """
    Generate a prioritized, budget-aware mod list for the given build.
    Pure Python logic — drop in OpenAI call here for AI-generated plans.
    """
    candidates = []

    # Collect all mods from categories the user cares about
    active_cats = set(build.categories) if build.categories else set(MOD_LIBRARY.keys())

    for cat in active_cats:
        if cat in MOD_LIBRARY:
            for mod in MOD_LIBRARY[cat]:
                mod_copy = dict(mod)
                mod_copy["category"] = cat
                mod_copy["score"] = _score_mod(mod, build)
                candidates.append(mod_copy)

    # Sort by score descending
    candidates.sort(key=lambda m: m["score"], reverse=True)

    # Budget-aware selection: fill up to 90% of budget
    selected = []
    running_total = 0.0
    budget_limit = build.budget * 0.90

    for mod in candidates:
        mod_mid = (mod["price_min"] + mod["price_max"]) / 2
        if running_total + mod_mid <= budget_limit and len(selected) < 8:
            selected.append(mod)
            running_total += mod_mid

    # If nothing fits, grab the cheapest 3 relevant mods as suggestions
    if not selected:
        selected = sorted(candidates[:6], key=lambda m: m["price_min"])[:3]

    # Assign final priority and build into response objects
    result = []
    for i, mod in enumerate(selected, start=1):
        result.append(ModRecommendation(
            name=mod["name"],
            category=mod["category"],
            description=mod["description"],
            price_min=mod["price_min"],
            price_max=mod["price_max"],
            difficulty=mod["difficulty"],
            stage=mod["stage"],
            priority=i,
            warnings=mod.get("warnings", []),
            brand_tips=mod.get("brand_tips", []),
        ))

    return result


def build_mod_plan(build_id: int, build: BuildCreate, mods: list[ModRecommendation]) -> ModPlan:
    """Assemble the full plan with budget math and stage breakdown."""
    total_min = sum(m.price_min for m in mods)
    total_max = sum(m.price_max for m in mods)
    budget_remaining = build.budget - ((total_min + total_max) / 2)

    warning = None
    if build.budget < 500:
        warning = "⚠️ Budget under $500 limits meaningful mods. Consider saving to $1,000+ for the biggest impact."
    elif budget_remaining < 0:
        warning = f"⚠️ Average cost (${(total_min+total_max)//2:,}) slightly exceeds budget. Prioritize Stage 1 mods first."

    # Stage breakdown
    stages: dict[str, list[str]] = {"Stage 1": [], "Stage 2": [], "Stage 3": []}
    for m in mods:
        key = f"Stage {m.stage}"
        if key in stages:
            stages[key].append(m.name)

    vehicle = f"{build.year} {build.make} {build.model}"
    summary = (
        f"Your {vehicle} build plan focuses on {build.goal}. "
        f"We've prioritized {len(mods)} mods across {len(set(m.stage for m in mods))} stages "
        f"within your ${build.budget:,.0f} budget. "
        f"Start with Stage 1 mods — they deliver the best return before moving to more complex upgrades."
    )

    return ModPlan(
        build_id=build_id,
        title=build.title,
        year=build.year,
        make=build.make,
        model=build.model,
        goal=build.goal,
        budget=build.budget,
        mods=mods,
        total_min=total_min,
        total_max=total_max,
        budget_remaining=budget_remaining,
        budget_warning=warning,
        summary=summary,
        stage_breakdown={k: v for k, v in stages.items() if v},
    )


def generate_chat_response(message: str, build_context: dict | None = None) -> str:
    """
    Generate a knowledgeable chat response.
    Replace this function body with an OpenAI API call to go live.
    """
    msg_lower = message.lower()
    ctx = build_context or {}

    # Detect intent and respond with domain knowledge
    if any(w in msg_lower for w in ["hello", "hi", "hey", "start", "help"]):
        return random.choice(CHAT_CONTEXT["greetings"])

    if any(w in msg_lower for w in ["budget", "money", "cost", "afford", "cheap"]):
        budget = ctx.get("budget", 0)
        if budget and budget < 1000:
            base = CHAT_CONTEXT["budget_low"][0].replace("${budget}", f"${budget:,.0f}")
            return f"{base} " + random.choice(CHAT_CONTEXT["budget_questions"])
        return random.choice(CHAT_CONTEXT["budget_questions"])

    if any(w in msg_lower for w in ["intake", "air filter", "cold air"]):
        return ("Cold air intakes are a great starting point. You're looking at $150–$400 for a quality unit. "
                "K&N and AEM are reliable mid-range choices. Injen and Mishimoto are worth the extra spend on "
                "turbo platforms where heat soak matters more. It won't make you fast by itself, but paired "
                "with an exhaust and tune it becomes part of a real system.")

    if any(w in msg_lower for w in ["exhaust", "muffler", "loud", "sound"]):
        return ("Exhaust choices depend on your goal. Want max sound on a budget? Axle-back swap, $200–$700. "
                "Want real power AND sound? Cat-back system, $400–$1,400. Turbocharged? The downpipe is where "
                "the biggest gains are. Just make sure you know your state's emissions situation before going catless.")

    if any(w in msg_lower for w in ["tune", "ecu", "remap", "flash"]):
        return ("An ECU tune is almost always the highest ROI mod you can do, but timing matters. "
                "Do your intake, exhaust, and intercooler (if turbo) FIRST, then tune. "
                "A tune on a stock car is leaving money on the table. "
                "Cobb Accessport is the go-to for most platforms — it's user-installable and reversible. "
                "Budget $400–$900 for a quality tune from a reputable tuner.")

    if any(w in msg_lower for w in ["suspension", "handling", "coilover", "spring", "lower"]):
        exp = ctx.get("experience", "intermediate")
        if exp == "beginner":
            return ("For handling on a budget, start with lowering springs ($150–$400). Easy to install, "
                    "real difference in stance and cornering. When budget allows, step up to coilovers for "
                    "full adjustability. BC Racing is the sweet spot for value — $700–$1,000 shipped.")
        return ("Coilovers are the move if you're serious about handling. KW V1 for street, Fortune Auto for "
                "street/track balance, Öhlins if you're not watching the budget. "
                "Don't forget: alignment is mandatory after install, budget $150 for that.")

    if any(w in msg_lower for w in ["wheel", "rim", "tire"]):
        return ("Wheels are the biggest visual bang for buck. Enkei RPF1s are the enthusiast standard — "
                "lightweight, affordable, available in every fitment. Work Wheels, Volk Racing, and BBS "
                "are the prestige options. Rule of thumb: stay within 3% of OEM diameter so your speedo "
                "and ABS stay accurate. Check fitment on fitmentindustries.com before ordering.")

    if any(w in msg_lower for w in ["daily", "daily driver"]):
        return ("Daily drivers need a smarter approach. Reliability-first mods (catch can, fresh plugs, "
                "cooling) before power. For feel: short throw shifter, tint, lowering springs. "
                "Avoid anything that hurts ride quality or emissions compliance. "
                "The goal is a car that's noticeably better every day without becoming a headache.")

    if any(w in msg_lower for w in ["track", "race", "autocross", "circuit"]):
        return ("Track builds have a different priority stack: safety and chassis before power. "
                "Order of operations: brake pads + fluid → alignment → suspension → safety equipment → "
                "then power mods. Too many people add power to a car that can't stop or turn properly. "
                "Don't be that person.")

    if any(w in msg_lower for w in ["warning", "danger", "risk", "safe"]):
        return ("Great question to ask. Things to watch: (1) Tuning requires quality supporting mods first. "
                "(2) Cheap coilovers can fail catastrophically. (3) Removing emissions equipment is illegal "
                "in many states. (4) Harnesses require roll protection. "
                "I'll always flag these when they apply to your build.")

    # Experience-aware catch-all
    exp = ctx.get("experience", "")
    if exp in CHAT_CONTEXT["experience_follow_ups"]:
        advice = CHAT_CONTEXT["experience_follow_ups"][exp]
        return f"{advice} What specific aspect of your build do you want to dig into?"

    return ("That's a solid question. Give me more context — what's the car, budget, and main goal? "
            "The more specific you are, the better I can tailor the advice to your exact situation.")
