# routers/billing.py
# Stripe Checkout + Billing Portal + webhook for the $10/mo Pro tier.
#
# Deliberately pure redirect-based Checkout — the backend creates a Session
# and hands back its URL; the frontend just navigates there. No Stripe.js,
# no client-side Stripe SDK, no card data ever touches this app. That's the
# simplest correct integration for a single fixed-price subscription.

import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from models.user import User
from routers.auth import get_current_user
from services.billing_service import get_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["Billing"])


def _require_configured() -> None:
    if not settings.billing_configured:
        raise HTTPException(
            status_code=503,
            detail="Billing isn't configured yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO to enable it.",
        )


class SessionUrl(BaseModel):
    url: str


class UsageResponse(BaseModel):
    plan: str
    builds_used: int
    builds_limit: int | None
    chat_messages_used_today: int
    chat_messages_limit: int | None
    subscription_cancel_at: datetime | None = None


@router.get("/usage", response_model=UsageResponse)
def billing_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_usage(db, current_user)


@router.post("/checkout", response_model=SessionUrl)
def create_checkout_session(current_user: User = Depends(get_current_user)):
    _require_configured()
    try:
        session = stripe.checkout.Session.create(
            api_key=settings.stripe_secret_key,
            mode="subscription",
            line_items=[{"price": settings.stripe_price_id_pro, "quantity": 1}],
            # Maps the webhook back to our user before we necessarily have a
            # stripe_customer_id on file yet (first-time subscribers).
            client_reference_id=str(current_user.id),
            customer_email=current_user.email,
            success_url=f"{settings.frontend_url}/billing?success=1",
            cancel_url=f"{settings.frontend_url}/billing?canceled=1",
        )
    except stripe.error.StripeError as e:
        logger.exception("Stripe checkout session creation failed")
        raise HTTPException(status_code=502, detail="Could not start checkout — please try again.") from e
    return {"url": session.url}


@router.post("/portal", response_model=SessionUrl)
def create_portal_session(current_user: User = Depends(get_current_user)):
    _require_configured()
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription to manage.")
    try:
        session = stripe.billing_portal.Session.create(
            api_key=settings.stripe_secret_key,
            customer=current_user.stripe_customer_id,
            return_url=f"{settings.frontend_url}/billing",
        )
    except stripe.error.StripeError as e:
        logger.exception("Stripe billing portal session creation failed")
        raise HTTPException(status_code=502, detail="Could not open the billing portal — please try again.") from e
    return {"url": session.url}


def _epoch_to_datetime(epoch: int | None) -> datetime | None:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).replace(tzinfo=None) if epoch else None


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # Deliberately not _require_configured() — this endpoint only ever needs
    # the webhook secret to verify a signature, never the price ID or a call
    # to Stripe's API, so it shouldn't be gated on the checkout/portal
    # config being complete too.
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Billing isn't configured yet.")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        logger.warning("Rejected webhook with invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = event["data"]["object"]
    event_type = event["type"]

    if event_type == "checkout.session.completed":
        user_id = data.get("client_reference_id")
        user = db.query(User).filter(User.id == int(user_id)).first() if user_id else None
        if user is None:
            logger.error("checkout.session.completed with no matching user (client_reference_id=%s)", user_id)
            return {"status": "ignored"}
        user.plan = "pro"
        user.stripe_customer_id = data.get("customer")
        user.stripe_subscription_id = data.get("subscription")
        db.commit()

    elif event_type == "customer.subscription.updated":
        customer_id = data.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user is None:
            logger.warning("customer.subscription.updated for unknown customer %s", customer_id)
            return {"status": "ignored"}
        user.plan = "pro" if data.get("status") in ("active", "trialing") else "free"
        user.subscription_cancel_at = _epoch_to_datetime(data.get("cancel_at"))
        db.commit()

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user is None:
            logger.warning("customer.subscription.deleted for unknown customer %s", customer_id)
            return {"status": "ignored"}
        user.plan = "free"
        user.stripe_subscription_id = None
        user.subscription_cancel_at = None
        db.commit()

    return {"status": "ok"}
