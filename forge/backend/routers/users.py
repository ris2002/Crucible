from fastapi import APIRouter, Depends, HTTPException, Query
from middleware.auth import get_current_user, get_optional_user
from services import supabase_service as db
from models import ProfileUpdateRequest

router = APIRouter()


@router.get("/{username}")
async def get_user_profile(username: str, user=Depends(get_optional_user)):
    profile = db.get_profile_by_username(username)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    follower_count = db.get_follower_count(profile["id"])
    following_count = db.get_following_count(profile["id"])
    idea_count = db.supabase_admin.table("ideas").select("id", count="exact").eq("author_id", profile["id"]).eq("status", "published").execute().count or 0

    is_following = False
    is_self = False
    if user:
        is_following = db.is_following(user.id, profile["id"])
        is_self = user.id == profile["id"]

    return {
        "id": profile["id"],
        "username": profile["username"],
        "bio": profile.get("bio"),
        "tier": profile.get("tier", "free"),
        "created_at": profile.get("created_at"),
        "follower_count": follower_count,
        "following_count": following_count,
        "idea_count": idea_count,
        "is_following": is_following,
        "is_self": is_self,
    }


@router.get("/{username}/ideas")
async def get_user_ideas(username: str, page: int = Query(1, ge=1)):
    ideas, total = db.get_user_ideas(username, page)
    pages = (total + 19) // 20
    return {"ideas": ideas, "total": total, "page": page, "pages": pages}


@router.post("/{username}/follow")
async def follow_user(username: str, user=Depends(get_current_user)):
    profile = db.get_profile_by_username(username)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    if profile["id"] == user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    is_following = db.toggle_follow(user.id, profile["id"])
    follower_count = db.get_follower_count(profile["id"])
    return {"is_following": is_following, "follower_count": follower_count}


@router.patch("/me/profile")
async def update_profile(body: ProfileUpdateRequest, user=Depends(get_current_user)):
    updates = {}
    if body.bio is not None:
        if len(body.bio) > 160:
            raise HTTPException(status_code=400, detail="Bio must be 160 characters or fewer")
        updates["bio"] = body.bio

    if updates:
        db.update_profile(user.id, updates)

    return db.get_profile(user.id)


@router.get("/notifications/all")
async def get_notifications(user=Depends(get_current_user)):
    notifications = db.get_notifications(user.id)
    unread_count = sum(1 for n in notifications if not n.get("read"))
    return {"notifications": notifications, "unread_count": unread_count}


@router.post("/notifications/read")
async def mark_read(body: dict, user=Depends(get_current_user)):
    ids = body.get("ids", [])
    db.mark_notifications_read(user.id, ids)
    return {"message": "Marked as read"}


@router.get("/me/ai-models")
async def get_ai_models():
    from services.ai_router import PROVIDERS
    return {"providers": PROVIDERS}


@router.get("/me/api-key/status")
async def api_key_status(user=Depends(get_current_user)):
    key, provider, model = db.get_user_ai_config(user.id)
    return {"has_key": bool(key), "provider": provider, "model": model}


@router.post("/me/api-key")
async def save_api_key(body: dict, user=Depends(get_current_user)):
    profile = db.get_profile(user.id)
    if not profile or profile.get("tier") != "alchemist":
        raise HTTPException(status_code=403, detail="Only Alchemist tier can store an API key")
    key = body.get("key", "").strip()
    provider = body.get("provider", "anthropic").strip()
    model = body.get("model", "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key is required")
    from services.ai_router import PROVIDERS
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Invalid provider")
    db.store_user_ai_config(user.id, key, provider, model)
    return {"message": "AI config saved"}


@router.delete("/me/api-key")
async def delete_api_key(user=Depends(get_current_user)):
    db.delete_user_api_key(user.id)
    return {"message": "API key removed"}
