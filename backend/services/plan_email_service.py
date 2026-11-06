# services/plan_email_service.py
# "Email me this plan" — captures the lead (email + vehicle + a full plan
# snapshot, see models/plan_email.py for why) and sends the plan as a
# plain-text email via the existing pluggable transport (core/email.py),
# same EMAIL_PROVIDER=mock/smtp pattern every other email in this app uses.

from sqlalchemy.orm import Session

from core.email import send_email
from models.plan_email import PlanEmailCapture, PlanEmailRequest
from models.recommendation import ModPlan


def _format_plan_email(plan: ModPlan) -> str:
    lines = [
        f"Here's your {plan.year} {plan.make} {plan.model} build plan from CarMods AI.",
        "",
        f"Goal: {plan.goal}",
        f"Budget: ${plan.budget:,.0f}",
        f"Estimated total: ${plan.total_min:,.0f}–${plan.total_max:,.0f}",
        "",
    ]
    if plan.summary:
        lines += [plan.summary, ""]

    for mod in sorted(plan.mods, key=lambda m: m.priority):
        lines.append(f"Stage {mod.stage} — {mod.name} (${mod.price_min:,.0f}–${mod.price_max:,.0f})")
        lines.append(f"  {mod.why}")
        if mod.impact:
            lines.append(f"  Impact: {mod.impact}")
        if mod.tradeoff:
            lines.append(f"  Tradeoff: {mod.tradeoff}")
        lines.append("")

    lines.append("This plan isn't saved to an account — this email is your copy of it.")
    return "\n".join(lines)


def send_plan_email(db: Session, data: PlanEmailRequest) -> PlanEmailCapture:
    """Persists the capture first — a lead is worth keeping even if the
    send below hits a transient SMTP problem — then sends. A send failure
    is deliberately NOT caught here: core/email.py's existing callers
    (routers/auth.py's verification/reset emails) don't swallow failures
    either, and "email me this plan" shouldn't silently claim success when
    it didn't send."""
    capture = PlanEmailCapture(
        email=data.email,
        year=data.plan.year,
        make=data.plan.make,
        model=data.plan.model,
        plan_snapshot=data.plan.model_dump(),
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    send_email(
        to=data.email,
        subject=f"Your {data.plan.year} {data.plan.make} {data.plan.model} build plan",
        text=_format_plan_email(data.plan),
    )

    return capture
