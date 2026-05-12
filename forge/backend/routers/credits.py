from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from services import supabase_service as db

router = APIRouter()


@router.get("/credits")
async def get_credits(user=Depends(get_current_user)):
    profile = db.get_profile(user.id)
    if not profile:
        username = (user.user_metadata or {}).get("username") or user.email.split("@")[0]
        profile = db.create_profile(user.id, username)
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")

    transactions = db.supabase_admin.table("credit_transactions").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(20).execute()

    return {
        "credits_remaining": profile.get("credits_remaining", 0),
        "credits_monthly": profile.get("credits_monthly", 3),
        "tier": profile.get("tier", "free"),
        "lifetime_sessions_used": profile.get("lifetime_sessions_used", 0),
        "transactions": transactions.data or [],
    }


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifications = db.get_notifications(user.id)
    unread_count = sum(1 for n in notifications if not n.get("read"))
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("/notifications/read")
async def mark_notifications_read(body: dict, user=Depends(get_current_user)):
    ids = body.get("ids", [])
    db.mark_notifications_read(user.id, ids)
    return {"message": "Marked as read"}
