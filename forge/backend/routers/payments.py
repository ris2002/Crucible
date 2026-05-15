import os
from fastapi import APIRouter, Depends, HTTPException, Request
from middleware.auth import get_current_user
from services import stripe_service as stripe_svc
from models import SubscribeRequest

router = APIRouter()


@router.get("/config")
async def purchases_config():
    from services import supabase_service as db
    return db.get_app_settings()


@router.post("/subscribe")
async def subscribe(body: SubscribeRequest, user=Depends(get_current_user)):
    if body.tier not in ("thinker", "scholar", "alchemist"):
        raise HTTPException(status_code=400, detail="Invalid tier")

    from services import supabase_service as db
    if not db.get_upgrades_enabled():
        raise HTTPException(status_code=403, detail="Tier upgrades are currently disabled")

    user_auth = db.supabase_admin.auth.admin.get_user_by_id(user.id)
    email = user_auth.user.email if user_auth.user else None

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    url, _ = stripe_svc.create_subscription_checkout(user.id, body.tier, frontend_url, email)
    return {"checkout_url": url}


@router.post("/extend-turns")
async def extend_turns(body: dict, user=Depends(get_current_user)):
    from services import supabase_service as db
    if not db.get_purchases_enabled():
        raise HTTPException(status_code=403, detail="Purchases are currently disabled")
    profile = db.get_profile(user.id)
    if profile and profile.get("tier") == "alchemist":
        raise HTTPException(status_code=400, detail="Alchemist tier has unlimited turns")

    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    url, _ = stripe_svc.create_turn_extension_checkout(user.id, session_id, frontend_url)
    return {"checkout_url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = stripe_svc.handle_webhook(payload, sig_header)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    stripe_svc.process_payment_success(event)
    return {"received": True}


@router.post("/sync")
async def sync_subscription(user=Depends(get_current_user)):
    result = stripe_svc.sync_subscription_from_stripe(user.id)
    return result


@router.post("/sync-turns")
async def sync_turns(body: dict, user=Depends(get_current_user)):
    from services import supabase_service as db
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    checkout_id = body.get("checkout_id")
    if checkout_id:
        import stripe
        try:
            checkout = stripe.checkout.Session.retrieve(checkout_id)
            if checkout.payment_status == "paid":
                session = db.supabase_admin.table("forge_sessions").select("*").eq("id", session_id).eq("user_id", user.id).maybe_single().execute()
                if session.data:
                    current_max = session.data.get("max_turns_extended") or session.data.get("turns_used", 0) + 5
                    db.supabase_admin.table("forge_sessions").update({"max_turns_extended": current_max + 4}).eq("id", session_id).execute()
                    return {"synced": True, "new_max_turns": current_max + 4}
        except Exception as e:
            print(f"[sync-turns] {e}")
    return {"synced": False}


@router.delete("/subscription")
async def cancel_subscription(user=Depends(get_current_user)):
    success = stripe_svc.cancel_subscription(user.id)
    if not success:
        raise HTTPException(status_code=400, detail="No active subscription found")
    return {"message": "Subscription will cancel at end of billing period"}
