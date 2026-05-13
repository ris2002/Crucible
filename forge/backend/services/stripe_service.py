import os
import stripe
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICES = {
    "thinker": "price_thinker_monthly",
    "scholar": "price_scholar_monthly",
}

TIER_CREDITS = {
    "thinker": 10,
    "scholar": 25,
}

TIER_ROLLOVER_CAP = {
    "thinker": 20,
    "scholar": 50,
}


def create_subscription_checkout(user_id: str, tier: str, frontend_url: str, email: str = None):
    from services.supabase_service import supabase_admin, get_profile

    profile = get_profile(user_id)
    customer_id = profile.get("stripe_customer_id") if profile else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id}
        )
        customer_id = customer.id
        supabase_admin.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user_id).execute()

    price_map = {
        "thinker": os.getenv("STRIPE_PRICE_THINKER", ""),
        "scholar": os.getenv("STRIPE_PRICE_SCHOLAR", ""),
    }

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_map[tier], "quantity": 1}] if price_map.get(tier) else [],
        success_url=f"{frontend_url}/settings?subscription=success&tier={tier}",
        cancel_url=f"{frontend_url}/settings?subscription=cancelled",
        metadata={"user_id": user_id, "tier": tier},
    )
    return session.url, session.id


def create_turn_extension_checkout(user_id: str, session_id: str, frontend_url: str):
    price_id = os.getenv("STRIPE_PRICE_TURNS", "")
    line_items = (
        [{"price": price_id, "quantity": 1}]
        if price_id else
        [{"price_data": {"currency": "gbp", "unit_amount": 200, "product_data": {"name": "Crucible Turn Extension (+4 turns)"}}, "quantity": 1}]
    )
    checkout = stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url=f"{frontend_url}/forge?session_id={session_id}&extended=true&checkout_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/forge?session_id={session_id}",
        metadata={"user_id": user_id, "forge_session_id": session_id, "type": "turn_extension"},
    )
    return checkout.url, checkout.id


def sync_subscription_from_stripe(user_id: str) -> dict:
    from services.supabase_service import supabase_admin, get_profile

    profile = get_profile(user_id)
    customer_id = profile.get("stripe_customer_id") if profile else None

    if not customer_id:
        return {"synced": False, "reason": "no_customer"}

    subscriptions = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
    if not subscriptions.data:
        return {"synced": False, "reason": "no_active_subscription"}

    sub = subscriptions.data[0]
    price_id = sub["items"]["data"][0]["price"]["id"]

    price_to_tier = {
        os.getenv("STRIPE_PRICE_THINKER", ""): "thinker",
        os.getenv("STRIPE_PRICE_SCHOLAR", ""): "scholar",
    }
    tier = price_to_tier.get(price_id)
    if not tier:
        return {"synced": False, "reason": "unknown_price"}

    monthly_credits = TIER_CREDITS[tier]
    rollover_cap = TIER_ROLLOVER_CAP[tier]
    current_credits = profile.get("credits_remaining", 0)
    current_tier = profile.get("tier", "free")

    if current_tier != tier:
        new_credits = current_credits + monthly_credits
        supabase_admin.table("profiles").update({
            "tier": tier,
            "credits_remaining": new_credits,
            "credits_monthly": monthly_credits,
        }).eq("id", user_id).execute()
        supabase_admin.table("credit_transactions").insert({
            "user_id": user_id,
            "amount": monthly_credits,
            "type": "subscription",
            "description": f"Synced subscription: {tier}",
        }).execute()
        return {"synced": True, "tier": tier, "credits": new_credits}

    return {"synced": True, "tier": tier, "credits": current_credits, "already_current": True}


def cancel_subscription(user_id: str):
    from services.supabase_service import supabase_admin, get_profile
    profile = get_profile(user_id)
    customer_id = profile.get("stripe_customer_id") if profile else None
    if not customer_id:
        return False

    subscriptions = stripe.Subscription.list(customer=customer_id, status="active")
    cancelled = False
    for sub in subscriptions.data:
        stripe.Subscription.cancel(sub.id)
        cancelled = True

    if cancelled:
        # Immediately drop to free tier — keep credits_remaining unchanged
        supabase_admin.table("profiles").update({
            "tier": "free",
            "credits_monthly": 3,
        }).eq("id", user_id).execute()

    return cancelled


def handle_webhook(payload: bytes, sig_header: str):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        return None
    return event


def process_payment_success(event):
    from services.supabase_service import supabase_admin, get_profile

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata", {})
        user_id = metadata.get("user_id")
        payment_type = metadata.get("type", "")
        tier = metadata.get("tier", "")
        forge_session_id = metadata.get("forge_session_id", "")

        if not user_id:
            return

        if payment_type == "turn_extension":
            session = supabase_admin.table("forge_sessions").select("*").eq("id", forge_session_id).single().execute()
            if session.data:
                current_max = session.data.get("max_turns_extended", session.data.get("turns_used", 0) + 5)
                supabase_admin.table("forge_sessions").update({
                    "max_turns_extended": current_max + 4
                }).eq("id", forge_session_id).execute()

        elif tier in ("thinker", "scholar"):
            profile = get_profile(user_id)
            current_credits = profile.get("credits_remaining", 0) if profile else 0
            monthly_credits = TIER_CREDITS[tier]
            new_credits = current_credits + monthly_credits

            supabase_admin.table("profiles").update({
                "tier": tier,
                "credits_remaining": new_credits,
                "credits_monthly": monthly_credits,
            }).eq("id", user_id).execute()

            supabase_admin.table("credit_transactions").insert({
                "user_id": user_id,
                "amount": monthly_credits,
                "type": "subscription",
                "description": f"Subscribed to {tier} tier",
                "stripe_payment_id": obj.get("payment_intent") or obj.get("id"),
            }).execute()

    elif event_type == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        if customer_id:
            profiles = supabase_admin.table("profiles").select("id").eq("stripe_customer_id", customer_id).execute()
            if profiles.data:
                user_id = profiles.data[0]["id"]
                supabase_admin.table("profiles").update({
                    "tier": "free",
                    "credits_monthly": 3,
                }).eq("id", user_id).execute()

    elif event_type == "invoice.payment_succeeded":
        customer_id = obj.get("customer")
        if customer_id:
            profiles = supabase_admin.table("profiles").select("*").eq("stripe_customer_id", customer_id).execute()
            if profiles.data:
                profile = profiles.data[0]
                user_id = profile["id"]
                tier = profile["tier"]
                if tier in TIER_CREDITS:
                    monthly_credits = TIER_CREDITS[tier]
                    current = profile["credits_remaining"]
                    new_credits = current + monthly_credits
                    supabase_admin.table("profiles").update({
                        "credits_remaining": new_credits
                    }).eq("id", user_id).execute()
                    supabase_admin.table("credit_transactions").insert({
                        "user_id": user_id,
                        "amount": monthly_credits,
                        "type": "renewal",
                        "description": f"Monthly credit renewal ({tier})",
                    }).execute()
