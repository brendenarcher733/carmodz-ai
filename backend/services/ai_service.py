"""
services/ai_service.py

Mod Advisor AI service.
  - Uses a rich mock engine by default (no API key needed).
  - When OPENAI_API_KEY is set in .env, automatically switches to GPT-4o.
  - Anthropic support: swap the _call_openai method for _call_anthropic.

The public interfaces (generate_recommendations, chat_response) never change,
so the frontend and routers are fully decoupled from the AI provider.
"""

import json
import random
from datetime import datetime
from typing import Optional

from core.config import settings
from models.schemas import RecommendationRequest


# ── Mod Knowledge Base ────────────────────────────────────────────────────────
# Realistic mod data used by the mock engine.
# Organised by category, each mod has price range, difficulty, and stage.

MOD_DATABASE = {
    "performance": [
        {
            "name": "Cold Air Intake",
            "description": "Replaces the factory air box with a free-flowing intake tube and high-flow filter. Drops intake temps 10–20°F, adds a satisfying induction sound, and nets 5–15 hp on most platforms. Best first mod — fully reversible.",
            "price_low": 150, "price_high": 400,
            "difficulty": "beginner", "priority": 1, "stage": 1,
            "notes": "K&N, AEM, and Injen are reliable brands. Avoid cheap eBay intakes — they can trigger CEL codes.",
        },
        {
            "name": "Cat-Back Exhaust",
            "description": "Replaces the stock exhaust from the catalytic converter back. Reduces backpressure, adds 10–20 hp on NA engines, and transforms the sound character. One of the highest feel-per-dollar mods available.",
            "price_low": 400, "price_high": 1200,
            "difficulty": "intermediate", "priority": 2, "stage": 1,
            "notes": "Resonated options keep drone manageable for daily driving. Full straight-pipe setups can get tiresome on long drives.",
        },
        {
            "name": "ECU Tune / Remap",
            "description": "Recalibrates ignition timing, fuel maps, and boost targets (if turbocharged) to extract maximum power from your current hardware. The single best bang-for-buck after intake and exhaust.",
            "price_low": 400, "price_high": 900,
            "difficulty": "intermediate", "priority": 2, "stage": 2,
            "notes": "Always tune AFTER supporting mods are installed. A good tuner is worth more than a cheap dyno session.",
        },
        {
            "name": "Turbocharger Upgrade / Kit",
            "description": "Either upgrading a factory turbo or adding forced induction to a naturally aspirated engine. Transforms the power delivery entirely — expect 50–150+ whp gains with supporting mods.",
            "price_low": 1800, "price_high": 6000,
            "difficulty": "advanced", "priority": 3, "stage": 3,
            "warning": "Requires supporting fuel, cooling, and fuelling upgrades. Budget for intercooler, BOV, and tune on top of the turbo cost.",
        },
        {
            "name": "High-Flow Catalytic Converter",
            "description": "Reduces exhaust restriction significantly while keeping emissions compliance on most platforms. Pairs perfectly with a cat-back for noticeable power gains.",
            "price_low": 200, "price_high": 600,
            "difficulty": "intermediate", "priority": 3, "stage": 2,
            "notes": "Check local emissions laws — straight pipes may not pass inspection.",
        },
        {
            "name": "Fuel Injector Upgrade",
            "description": "Larger injectors to support increased fuel demand from power mods. Essential above ~30% power increase over stock.",
            "price_low": 300, "price_high": 800,
            "difficulty": "advanced", "priority": 4, "stage": 3,
            "warning": "Must be paired with a custom tune. Running larger injectors on a stock tune will cause rich/lean conditions.",
        },
    ],
    "handling": [
        {
            "name": "Coilover Suspension",
            "description": "Fully adjustable ride height and damping. The cornerstone of any serious handling build — dial in exactly the balance between ride comfort and cornering performance you want.",
            "price_low": 700, "price_high": 2500,
            "difficulty": "intermediate", "priority": 1, "stage": 1,
            "notes": "Budget-end coilovers (Fortune Auto, BC Racing) are excellent value. Avoid the cheapest eBay sets — they fail quickly.",
        },
        {
            "name": "Sway Bar Upgrade (Front + Rear)",
            "description": "Stiffer sway bars reduce body roll in corners dramatically, sharpening steering response. One of the most underrated handling mods — huge effect for modest cost.",
            "price_low": 200, "price_high": 600,
            "difficulty": "intermediate", "priority": 2, "stage": 1,
            "notes": "Whiteline and Eibach make quality options for most platforms.",
        },
        {
            "name": "Strut Tower Brace",
            "description": "Connects the two front strut towers, reducing chassis flex and improving steering feel and feedback. Simple bolt-on with no downsides.",
            "price_low": 80, "price_high": 250,
            "difficulty": "beginner", "priority": 3, "stage": 1,
        },
        {
            "name": "Performance Brake Pads + Rotors",
            "description": "Upgraded pads with better friction material reduce stopping distances and resist fade under hard braking. Slotted or cross-drilled rotors improve heat dissipation.",
            "price_low": 250, "price_high": 700,
            "difficulty": "beginner", "priority": 1, "stage": 1,
            "notes": "Hawk HPS pads are excellent for street/track. Brembo rotors are a reliable choice.",
        },
        {
            "name": "Alignment + Corner Balance",
            "description": "A proper performance alignment unlocks everything else you've installed. Without correct camber, caster, and toe, even expensive suspension is wasted.",
            "price_low": 150, "price_high": 350,
            "difficulty": "beginner", "priority": 1, "stage": 1,
            "notes": "Do this every time you change ride height or install suspension components.",
        },
    ],
    "sound": [
        {
            "name": "Aftermarket Exhaust (Axle-Back)",
            "description": "Replaces only the rear section of the exhaust. Lower cost than a full cat-back, still delivers a noticeably deeper, more aggressive tone without major drone.",
            "price_low": 200, "price_high": 600,
            "difficulty": "beginner", "priority": 1, "stage": 1,
        },
        {
            "name": "Resonator Delete",
            "description": "Removes the resonator from the exhaust path, freeing up flow and adding a raspier, more aggressive sound character. A cheap way to change the exhaust note.",
            "price_low": 50, "price_high": 200,
            "difficulty": "beginner", "priority": 2, "stage": 1,
            "warning": "Can introduce drone at highway speeds on some platforms. Test before committing.",
        },
        {
            "name": "Intake + Airbox Modification",
            "description": "Opening the factory airbox or switching to a pod filter amplifies induction sound significantly — that satisfying whoosh under acceleration.",
            "price_low": 80, "price_high": 300,
            "difficulty": "beginner", "priority": 2, "stage": 1,
        },
        {
            "name": "Full Cat-Back + High-Flow Cat Combo",
            "description": "The complete sound package. A properly selected cat-back combined with a high-flow cat gives you a full, rich exhaust note across the RPM range without being obnoxious.",
            "price_low": 600, "price_high": 1800,
            "difficulty": "intermediate", "priority": 1, "stage": 2,
        },
    ],
    "cosmetic": [
        {
            "name": "Wheel Upgrade",
            "description": "Lightweight forged or cast aftermarket wheels reduce unsprung weight, improve handling response, and define the visual identity of the build. The single most impactful cosmetic change.",
            "price_low": 800, "price_high": 3000,
            "difficulty": "beginner", "priority": 1, "stage": 1,
            "notes": "Stay within OEM diameter to maintain speedometer accuracy. Consider +1 sizing for better tire options.",
        },
        {
            "name": "Window Tint (Ceramic)",
            "description": "Ceramic tint blocks 99% UV, reduces cabin heat load by up to 60%, and gives the car a polished, intentional appearance. Significantly better than standard dyed film.",
            "price_low": 200, "price_high": 500,
            "difficulty": "beginner", "priority": 2, "stage": 1,
            "notes": "Check state-specific legal VLT limits before selecting tint percentage.",
        },
        {
            "name": "Front Lip / Splitter",
            "description": "Adds visual aggression and provides a small aerodynamic benefit by redirecting airflow under the car. Carbon fibre or polyurethane options available.",
            "price_low": 150, "price_high": 800,
            "difficulty": "beginner", "priority": 3, "stage": 1,
        },
        {
            "name": "Lowering Springs",
            "description": "Drops ride height 1.0–1.5 inches, eliminating wheel gap and sharpening the stance. More affordable than coilovers but with no adjustability.",
            "price_low": 150, "price_high": 400,
            "difficulty": "intermediate", "priority": 2, "stage": 1,
        },
        {
            "name": "Full Wrap or Paint Correction",
            "description": "A vinyl wrap changes the car's colour completely without permanent modification. Paint correction + ceramic coating protects and deepens the factory finish.",
            "price_low": 1500, "price_high": 5000,
            "difficulty": "advanced", "priority": 4, "stage": 3,
        },
    ],
    "reliability": [
        {
            "name": "Timing Belt / Chain Service",
            "description": "If overdue, this is the most important job on the car. A failed timing belt or chain can destroy the engine instantly. Prioritise this above any performance mods.",
            "price_low": 400, "price_high": 1200,
            "difficulty": "advanced", "priority": 1, "stage": 1,
            "warning": "Do NOT delay this service. Engine replacement costs 10x more than prevention.",
        },
        {
            "name": "Cooling System Overhaul",
            "description": "Replace thermostat, coolant hoses, water pump, and flush the system with fresh coolant. Overheating is the most common cause of engine damage — don't skip this.",
            "price_low": 200, "price_high": 600,
            "difficulty": "intermediate", "priority": 1, "stage": 1,
        },
        {
            "name": "High-Quality Spark Plugs & Ignition Coils",
            "description": "Fresh NGK or Denso plugs + new coils restore full combustion efficiency. Often overlooked — bad ignition costs power, fuel economy, and can cause misfires.",
            "price_low": 80, "price_high": 300,
            "difficulty": "beginner", "priority": 2, "stage": 1,
        },
        {
            "name": "Transmission & Differential Fluid Service",
            "description": "Fresh fluid restores smooth shifts and protects the drivetrain under higher loads from performance mods. Critical before any power upgrades.",
            "price_low": 100, "price_high": 300,
            "difficulty": "beginner", "priority": 2, "stage": 1,
        },
        {
            "name": "Upgraded Radiator",
            "description": "An aluminium performance radiator keeps coolant temps stable under aggressive driving or track use. Essential for any turbocharged or high-output build.",
            "price_low": 200, "price_high": 600,
            "difficulty": "intermediate", "priority": 3, "stage": 2,
        },
    ],
    "interior": [
        {
            "name": "Short Throw Shifter",
            "description": "Reduces shift throw by 30–50%, making the transmission feel precise and connected. One of the highest feel-per-dollar mods for manual transmission cars.",
            "price_low": 80, "price_high": 250,
            "difficulty": "beginner", "priority": 1, "stage": 1,
        },
        {
            "name": "Aftermarket Steering Wheel + Hub",
            "description": "A smaller diameter wheel with improved grip material transforms driving feel. Pairs perfectly with a quick-release hub adapter.",
            "price_low": 200, "price_high": 600,
            "difficulty": "intermediate", "priority": 2, "stage": 2,
            "warning": "Most aftermarket wheels disable airbag. Only use on track/project cars — not recommended for daily drivers.",
        },
        {
            "name": "Racing Seats + Harness",
            "description": "Bucket seats hold you in place under lateral G-forces and dramatically improve driving feel. Essential for track use.",
            "price_low": 400, "price_high": 2000,
            "difficulty": "intermediate", "priority": 3, "stage": 2,
            "warning": "Racing harnesses require a roll cage or harness bar to be safe. A 5-point harness without a cage is more dangerous than a stock belt in a crash.",
        },
        {
            "name": "Pedal Spacers + Heel-Toe Kit",
            "description": "Repositions pedals for optimal heel-toe downshifting technique. Improves driver control and reduces fatigue on track.",
            "price_low": 50, "price_high": 150,
            "difficulty": "beginner", "priority": 3, "stage": 2,
        },
        {
            "name": "Data Logger / Boost Controller",
            "description": "An AEM or Defi gauge cluster or OBD2 data logger lets you monitor vitals in real time. Essential for any turbocharged build.",
            "price_low": 150, "price_high": 500,
            "difficulty": "beginner", "priority": 2, "stage": 2,
        },
    ],
}

# Goal-to-category priority mapping
GOAL_CATEGORY_MAP = {
    "daily_driver":      ["reliability", "cosmetic", "interior", "handling"],
    "performance":       ["performance", "handling", "sound", "reliability"],
    "track_focused":     ["performance", "handling", "reliability", "interior"],
    "street_style":      ["cosmetic", "sound", "handling", "performance"],
    "budget_build":      ["performance", "handling", "reliability"],
    "reliability":       ["reliability", "interior", "handling"],
    "cosmetic":          ["cosmetic", "interior", "sound"],
    "sound":             ["sound", "performance", "cosmetic"],
    "beginner_friendly": ["reliability", "cosmetic", "interior", "handling"],
}

# Chatbot system personality
ADVISOR_PERSONA = """You are a knowledgeable, no-BS car enthusiast and mechanic with 15 years of experience.
You've built everything from budget Honda builds to serious track cars. You speak plainly, give real advice,
warn people about common mistakes, and help them get the most from their budget.
You know pricing, difficulty, parts brands, and realistic expectations.
Never be generic. Always tailor advice to the specific car and budget mentioned.
When someone has a tight budget, be honest and help them prioritise.
Use car enthusiast terms naturally but explain them when needed.
Keep responses focused and useful — 3-5 sentences per point maximum."""


# ── Recommendation Engine ─────────────────────────────────────────────────────

def generate_recommendations(req: RecommendationRequest) -> list[dict]:
    """
    Core recommendation engine.
    Returns a prioritised, budget-aware list of mod recommendations.

    When a real AI key is configured, this delegates to the AI provider.
    Otherwise it uses the curated mock engine below.
    """
    if settings.use_real_ai:
        return _ai_recommendations(req)
    return _mock_recommendations(req)


def _mock_recommendations(req: RecommendationRequest) -> list[dict]:
    """
    Deterministic mock recommendation engine.
    Selects mods based on goal/category priorities, filters by budget,
    and stages them across a sensible build path.
    """
    # Determine which categories to pull from based on goal + user selection
    goal_priority = GOAL_CATEGORY_MAP.get(req.build_goal, req.categories)
    active_cats = [c for c in goal_priority if c in req.categories] or req.categories

    budget_remaining = req.budget
    selected: list[dict] = []
    seen_names: set[str] = set()

    # Walk categories in priority order
    for cat in active_cats:
        mods = MOD_DATABASE.get(cat, [])
        # Sort by priority within category
        for mod in sorted(mods, key=lambda m: m["priority"]):
            if mod["name"] in seen_names:
                continue
            # Budget gate — include if the low estimate fits remaining budget
            if mod["price_low"] <= budget_remaining:
                entry = {**mod, "category": cat}
                selected.append(entry)
                budget_remaining -= mod["price_low"]
                seen_names.add(mod["name"])
            if len(selected) >= 12:
                break
        if len(selected) >= 12:
            break

    # Beginner filter — remove advanced mods for beginner users
    if req.experience == "beginner":
        selected = [m for m in selected if m["difficulty"] != "advanced"]

    # Daily driver filter — remove mods with airbag/cage warnings
    if req.usage == "daily":
        selected = [
            m for m in selected
            if "airbag" not in (m.get("warning") or "").lower()
            and "roll cage" not in (m.get("warning") or "").lower()
        ]

    # Assign final priority ranking
    for i, mod in enumerate(selected):
        mod["priority"] = i + 1

    return selected


def _ai_recommendations(req: RecommendationRequest) -> list[dict]:
    """
    Real AI recommendation generation via OpenAI.
    Called automatically when OPENAI_API_KEY is set.
    Returns the same shape as the mock engine.
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        prompt = f"""You are a car modification expert. Generate a JSON array of modification recommendations.

Car: {req.year} {req.make} {req.model}
Budget: ${req.budget:,.0f}
Goal: {req.build_goal.replace("_", " ")}
Experience: {req.experience}
Usage: {req.usage}
Categories: {", ".join(req.categories)}

Return a JSON array of objects with these exact fields:
- name (string)
- category (one of: {", ".join(req.categories)})
- description (2-3 sentences, specific to this car and goal)
- price_low (number, USD)
- price_high (number, USD)  
- difficulty (beginner|intermediate|advanced)
- priority (1=highest)
- stage (1|2|3)
- warning (string or null)
- notes (string or null)

Rules:
- Total price_low sum must not exceed ${req.budget:,.0f}
- Prioritise reliability mods if experience is beginner
- Stage 1 should be achievable within 50% of budget
- Include 6-10 mods maximum
- Be specific to the {req.year} {req.make} {req.model} platform

Return ONLY valid JSON array, no other text."""

        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        content = response.choices[0].message.content
        data = json.loads(content)

        # Handle {"mods": [...]} or bare array
        if isinstance(data, dict):
            mods = data.get("mods") or data.get("recommendations") or list(data.values())[0]
        else:
            mods = data

        return mods

    except Exception as e:
        print(f"[AI] OpenAI call failed: {e} — falling back to mock engine")
        return _mock_recommendations(req)


# ── Chat Engine ───────────────────────────────────────────────────────────────

MOCK_CHAT_RESPONSES = {
    "greeting": [
        "What's up! Tell me about your build — year, make, model, and what you're trying to accomplish. I'll help you figure out the smartest path forward for your budget.",
        "Hey! Let's talk mods. What are you working with? Give me the car details and your budget and I'll lay out a realistic plan.",
    ],
    "budget_low": [
        "Honestly, with that budget I'd start with the fundamentals before touching anything performance-related. A fresh set of plugs, intake, and a good alignment will transform how the car feels and protect your investment.",
        "That's a tight budget for performance work. Focus on reliability first — timing belt if it's due, fresh fluids, coilovers if you can stretch it. Get the car sorted before adding power.",
    ],
    "budget_mid": [
        "Good budget to work with. I'd stage it: intake and exhaust first for sound and feel, then coilovers and alignment for handling, then tune everything together. You'll have a well-rounded build.",
        "With that budget you can do it right. Prioritise the mechanical stuff first, then go after the fun mods. Don't waste money on chrome trim pieces — put it in suspension and exhaust.",
    ],
    "budget_high": [
        "Now we're talking. With that budget you can do a proper build — forced induction, full suspension setup, brake upgrade, and still have budget left for a proper tune. Let's plan this out in stages.",
        "That opens up a lot of options. I'd approach it in three stages: foundation mods, power mods, then track-oriented finishing. This way you're not waiting to enjoy the car while you save for the big stuff.",
    ],
    "track": [
        "For track use, safety and reliability come first — always. Brakes, tires, and alignment are worth more than power mods on a circuit. Then suspension, then power. That order matters.",
        "Track builds need to be sorted before they're fast. A mishandling car with 400hp is slower and more dangerous than a balanced car with 250hp. Sort the chassis first.",
    ],
    "daily": [
        "For a daily driver, I'd focus on mods that improve the experience without creating headaches — quality coilovers set conservatively, a tasteful exhaust, maybe wheels and tint. Reliability doesn't take a day off.",
        "Daily driven builds need to be liveable. Avoid anything that requires frequent maintenance or makes the car impractical. Intake, exhaust, alignment, and coilovers will make it feel completely different without causing problems.",
    ],
    "default": [
        "Great question. Give me a bit more context about what you're trying to achieve and I can give you a specific recommendation. What's the car being used for primarily?",
        "That depends on a few factors. What's your experience level, and is this a daily driver or more of a project car? That'll change my recommendation significantly.",
        "I've seen that mod done both well and badly. The key is to pair it with the right supporting modifications — what else have you got done on the car so far?",
    ],
}


def generate_chat_response(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict] = None,
) -> str:
    """
    Generate a contextual chat response.
    Uses real AI when key is configured, otherwise mock responses.
    """
    if settings.use_real_ai:
        return _ai_chat(message, session_history, vehicle)
    return _mock_chat(message, vehicle)


def _mock_chat(message: str, vehicle: Optional[dict] = None) -> str:
    """Smart mock chat that responds contextually to keywords."""
    msg_lower = message.lower()
    car_context = ""
    if vehicle:
        car_context = f"the {vehicle.get('year', '')} {vehicle.get('make', '')} {vehicle.get('model', '')}"

    # Budget detection
    budget = None
    for word in msg_lower.split():
        clean = word.replace("$", "").replace(",", "").replace("k", "000")
        try:
            budget = float(clean)
            break
        except ValueError:
            pass

    # Keyword routing
    if any(w in msg_lower for w in ["hello", "hi", "hey", "start", "help"]):
        return random.choice(MOCK_CHAT_RESPONSES["greeting"])

    if any(w in msg_lower for w in ["track", "circuit", "race", "autocross"]):
        return random.choice(MOCK_CHAT_RESPONSES["track"])

    if any(w in msg_lower for w in ["daily", "commute", "street", "everyday"]):
        return random.choice(MOCK_CHAT_RESPONSES["daily"])

    if budget is not None:
        if budget < 1500:
            response = random.choice(MOCK_CHAT_RESPONSES["budget_low"])
        elif budget < 5000:
            response = random.choice(MOCK_CHAT_RESPONSES["budget_mid"])
        else:
            response = random.choice(MOCK_CHAT_RESPONSES["budget_high"])
        return response

    return random.choice(MOCK_CHAT_RESPONSES["default"])


def _ai_chat(
    message: str,
    session_history: list[dict],
    vehicle: Optional[dict] = None,
) -> str:
    """Real AI chat via OpenAI."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        system_content = ADVISOR_PERSONA
        if vehicle:
            system_content += f"\n\nThe user is asking about their {vehicle.get('year')} {vehicle.get('make')} {vehicle.get('model')}."

        messages = [{"role": "system", "content": system_content}]
        # Include recent conversation history
        for msg in session_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            temperature=0.8,
            max_tokens=400,
        )
        return response.choices[0].message.content

    except Exception as e:
        print(f"[AI Chat] Failed: {e} — using mock")
        return _mock_chat(message, vehicle)
