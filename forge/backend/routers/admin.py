import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from services import supabase_service as db
from services import anthropic_service as ai

router = APIRouter()

INPUT_COST_GBP = 3 * 0.79 / 1_000_000
OUTPUT_COST_GBP = 15 * 0.79 / 1_000_000


def require_admin(user=Depends(get_current_user)):
    profile = db.supabase_admin.table("profiles").select("is_admin").eq("id", user.id).maybe_single().execute()
    if not profile.data or not profile.data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def calc_cost(input_tokens: int, output_tokens: int) -> float:
    return input_tokens * INPUT_COST_GBP + output_tokens * OUTPUT_COST_GBP


@router.get("/dashboard")
async def dashboard(admin=Depends(require_admin)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    flagged_count = db.supabase_admin.table("flagged_content").select("id", count="exact").eq("reviewed", False).execute()
    sessions_today = db.supabase_admin.table("forge_sessions").select("input_tokens,output_tokens").gte("created_at", today).execute()
    sessions_month = db.supabase_admin.table("forge_sessions").select("input_tokens,output_tokens").gte("created_at", month_start).execute()

    spend_today = sum(calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0) for s in (sessions_today.data or []))
    spend_month = sum(calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0) for s in (sessions_month.data or []))

    total_users = db.supabase_admin.table("profiles").select("id", count="exact").execute()
    new_users_today = db.supabase_admin.table("profiles").select("id", count="exact").gte("created_at", today).execute()
    total_ideas = db.supabase_admin.table("ideas").select("id", count="exact").eq("status", "published").execute()
    ideas_today = db.supabase_admin.table("ideas").select("id", count="exact").eq("status", "published").gte("created_at", today).execute()
    sessions_today_count = db.supabase_admin.table("forge_sessions").select("id", count="exact").gte("created_at", today).execute()
    active_users_today = db.supabase_admin.table("forge_sessions").select("user_id").gte("updated_at", today).execute()
    active_subs = db.supabase_admin.table("profiles").select("id", count="exact").in_("tier", ["thinker", "scholar"]).execute()

    unique_active = len(set(s["user_id"] for s in (active_users_today.data or [])))

    return {
        "flagged_count": flagged_count.count or 0,
        "spend_today_gbp": round(spend_today, 4),
        "spend_month_gbp": round(spend_month, 4),
        "active_users_today": unique_active,
        "total_users": total_users.count or 0,
        "new_users_today": new_users_today.count or 0,
        "total_ideas": total_ideas.count or 0,
        "ideas_today": ideas_today.count or 0,
        "sessions_today": sessions_today_count.count or 0,
        "active_subscriptions": active_subs.count or 0,
    }


@router.get("/flagged")
async def get_flagged(admin=Depends(require_admin)):
    result = db.supabase_admin.table("flagged_content").select(
        "*, ideas(id,title,summary,domain,genre,created_at,author_id,profiles!ideas_author_id_fkey(username)), reporter:profiles!flagged_content_reporter_id_fkey(username)"
    ).eq("reviewed", False).order("created_at", desc=True).execute()
    return {"flagged": result.data or []}


@router.get("/flagged/{flag_id}/session")
async def get_flagged_session(flag_id: str, admin=Depends(require_admin)):
    flag = db.supabase_admin.table("flagged_content").select("*, ideas(id,author_id)").eq("id", flag_id).maybe_single().execute()
    if not flag.data:
        raise HTTPException(status_code=404, detail="Flag not found")
    idea_id = flag.data["idea_id"]
    session = db.supabase_admin.table("forge_sessions").select("messages,domain,genre,turns_used").eq("idea_id", idea_id).maybe_single().execute()
    return {"messages": session.data.get("messages", []) if session.data else [], "flag": flag.data}


@router.post("/flagged/{flag_id}/dismiss")
async def dismiss_flag(flag_id: str, admin=Depends(require_admin)):
    db.supabase_admin.table("flagged_content").update({"reviewed": True, "dismissed": True}).eq("id", flag_id).execute()
    db.log_admin_action(admin.email, "dismiss_flag", "flag", flag_id)
    return {"message": "Dismissed"}


@router.post("/flagged/{flag_id}/delete-idea")
async def delete_flagged_idea(flag_id: str, admin=Depends(require_admin)):
    flag = db.supabase_admin.table("flagged_content").select("idea_id").eq("id", flag_id).maybe_single().execute()
    if not flag.data:
        raise HTTPException(status_code=404, detail="Flag not found")
    idea_id = flag.data["idea_id"]
    db.supabase_admin.table("ideas").update({"status": "draft"}).eq("id", idea_id).execute()
    db.supabase_admin.table("flagged_content").update({"reviewed": True}).eq("id", flag_id).execute()
    db.log_admin_action(admin.email, "delete_idea", "idea", idea_id, notes=f"via flag {flag_id}")
    return {"message": "Idea removed from feed"}


@router.post("/flagged/{flag_id}/ban-user")
async def ban_user_via_flag(flag_id: str, admin=Depends(require_admin)):
    flag = db.supabase_admin.table("flagged_content").select("*, ideas(author_id)").eq("id", flag_id).maybe_single().execute()
    if not flag.data:
        raise HTTPException(status_code=404, detail="Flag not found")
    author_id = flag.data["ideas"]["author_id"]
    db.supabase_admin.table("profiles").update({"banned": True, "soft_deleted": True}).eq("id", author_id).execute()
    db.supabase_admin.table("ideas").update({"status": "draft"}).eq("author_id", author_id).execute()
    db.supabase_admin.table("flagged_content").update({"reviewed": True}).eq("id", flag_id).execute()
    db.log_admin_action(admin.email, "ban_user", "user", author_id, notes=f"via flag {flag_id}")
    return {"message": "User banned"}


@router.get("/costs")
async def get_costs(admin=Depends(require_admin)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    monthly_cap = float(os.getenv("MONTHLY_SPEND_CAP_GBP", "100"))

    sessions_today = db.supabase_admin.table("forge_sessions").select(
        "input_tokens,output_tokens,created_at,user_id,profiles!forge_sessions_user_id_fkey(username)"
    ).gte("created_at", today).order("created_at").execute()

    sessions_month = db.supabase_admin.table("forge_sessions").select("input_tokens,output_tokens").gte("created_at", month_start).execute()

    spend_today = sum(calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0) for s in (sessions_today.data or []))
    spend_month = sum(calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0) for s in (sessions_month.data or []))

    hourly = {}
    for s in (sessions_today.data or []):
        hour = s["created_at"][11:13]
        hourly[hour] = hourly.get(hour, 0) + calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0)
    hourly_data = [{"hour": f"{h}:00", "cost": round(hourly.get(f"{i:02d}", 0), 4)} for i, h in enumerate([f"{i:02d}" for i in range(24)])]

    total_tokens = sum((s.get("input_tokens") or 0) + (s.get("output_tokens") or 0) for s in (sessions_today.data or []))
    session_count = len(sessions_today.data or [])
    avg_tokens = total_tokens // session_count if session_count else 0

    top_sessions = sorted(
        sessions_today.data or [],
        key=lambda s: calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0),
        reverse=True
    )[:10]

    return {
        "spend_today_gbp": round(spend_today, 4),
        "spend_month_gbp": round(spend_month, 4),
        "monthly_cap_gbp": monthly_cap,
        "cap_percent": round(spend_month / monthly_cap * 100, 1) if monthly_cap else 0,
        "sessions_today": session_count,
        "avg_tokens_per_session": avg_tokens,
        "hourly": hourly_data,
        "top_sessions": [
            {
                "username": (s.get("profiles") or {}).get("username", "unknown"),
                "input_tokens": s.get("input_tokens") or 0,
                "output_tokens": s.get("output_tokens") or 0,
                "cost_gbp": round(calc_cost(s.get("input_tokens") or 0, s.get("output_tokens") or 0), 4),
            }
            for s in top_sessions
        ],
    }


@router.post("/seed/generate")
async def generate_seed(body: dict, admin=Depends(require_admin)):
    domain = body.get("domain", "Technology")
    genre = body.get("genre", "Observation")
    hint = body.get("hint", "")
    try:
        idea = ai.generate_seed_idea(domain, genre, hint)
        return {"idea": idea}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seed/post")
async def post_seed_idea(body: dict, admin=Depends(require_admin)):
    admin_profile = db.supabase_admin.table("profiles").select("id,credits_remaining").eq("id", admin.id).maybe_single().execute()
    if not admin_profile.data or admin_profile.data.get("credits_remaining", 0) < 1:
        raise HTTPException(status_code=402, detail="No seed credits remaining this month")

    result = db.supabase_admin.table("ideas").insert({
        "author_id": admin.id,
        "title": body.get("title", ""),
        "summary": body.get("summary", ""),
        "domain": body.get("domain", "Technology"),
        "genre": body.get("genre", "Observation"),
        "tags": body.get("tags", []),
        "status": "published",
    }).execute()

    idea_id = result.data[0]["id"] if result.data else "unknown"

    new_credits = admin_profile.data["credits_remaining"] - 1
    db.supabase_admin.table("profiles").update({"credits_remaining": new_credits}).eq("id", admin.id).execute()

    db.log_admin_action(admin.email, "seed_post", "idea", idea_id)
    return {"idea_id": idea_id, "credits_remaining": new_credits, "message": "Posted"}


@router.get("/users")
async def list_users(search: str = "", admin=Depends(require_admin)):
    try:
        auth_users = db.supabase_admin.auth.admin.list_users()
        users_map = {u.id: {"email": u.email, "last_sign_in": str(u.last_sign_in_at or "")} for u in auth_users}
    except Exception:
        users_map = {}

    query = db.supabase_admin.table("profiles").select("*")
    if search:
        query = query.ilike("username", f"%{search}%")
    profiles = query.order("created_at", desc=True).limit(100).execute()

    results = []
    for p in (profiles.data or []):
        auth_info = users_map.get(p["id"], {})
        if search and search.lower() not in p.get("username", "").lower() and search.lower() not in auth_info.get("email", "").lower():
            continue
        ideas_count = db.supabase_admin.table("ideas").select("id", count="exact").eq("author_id", p["id"]).eq("status", "published").execute()
        results.append({
            **p,
            "email": auth_info.get("email", ""),
            "last_sign_in": auth_info.get("last_sign_in", ""),
            "ideas_count": ideas_count.count or 0,
        })
    return {"users": results}


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin=Depends(require_admin)):
    profile = db.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        auth_user = db.supabase_admin.auth.admin.get_user_by_id(user_id)
        email = auth_user.user.email if auth_user.user else ""
    except Exception:
        email = ""

    ideas = db.supabase_admin.table("ideas").select("*").eq("author_id", user_id).order("created_at", desc=True).execute()
    transactions = db.supabase_admin.table("credit_transactions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
    sessions_count = db.supabase_admin.table("forge_sessions").select("id", count="exact").eq("user_id", user_id).execute()
    reports_by = db.supabase_admin.table("flagged_content").select("*").eq("reporter_id", user_id).execute()
    reports_against = db.supabase_admin.table("flagged_content").select("*, ideas(title)").eq("ideas.author_id", user_id).execute()

    return {
        "profile": {**profile, "email": email},
        "ideas": ideas.data or [],
        "transactions": transactions.data or [],
        "sessions_count": sessions_count.count or 0,
        "reports_by": reports_by.data or [],
        "reports_against": reports_against.data or [],
    }


@router.post("/users/{user_id}/credits")
async def adjust_credits(user_id: str, body: dict, admin=Depends(require_admin)):
    credits = int(body.get("credits", 0))
    db.supabase_admin.table("profiles").update({"credits_remaining": credits}).eq("id", user_id).execute()
    db.log_admin_action(admin.email, "adjust_credits", "user", user_id, notes=f"set to {credits}")
    return {"message": "Updated"}


@router.post("/users/{user_id}/tier")
async def change_tier(user_id: str, body: dict, admin=Depends(require_admin)):
    tier = body.get("tier", "free")
    db.supabase_admin.table("profiles").update({"tier": tier}).eq("id", user_id).execute()
    db.log_admin_action(admin.email, "change_tier", "user", user_id, notes=f"set to {tier}")
    return {"message": "Updated"}


@router.delete("/users/{user_id}/ideas/{idea_id}")
async def admin_delete_idea(user_id: str, idea_id: str, admin=Depends(require_admin)):
    db.supabase_admin.table("ideas").update({"status": "draft"}).eq("id", idea_id).execute()
    db.log_admin_action(admin.email, "delete_idea", "idea", idea_id, notes=f"owner {user_id}")
    return {"message": "Removed from feed"}


@router.post("/users/{user_id}/soft-delete")
async def soft_delete_user(user_id: str, admin=Depends(require_admin)):
    db.supabase_admin.table("profiles").update({"banned": True, "soft_deleted": True}).eq("id", user_id).execute()
    db.supabase_admin.table("ideas").update({"status": "draft"}).eq("author_id", user_id).execute()
    db.log_admin_action(admin.email, "soft_delete", "user", user_id)
    return {"message": "User soft deleted"}


@router.post("/users/{user_id}/unban")
async def unban_user(user_id: str, admin=Depends(require_admin)):
    db.supabase_admin.table("profiles").update({"banned": False, "soft_deleted": False}).eq("id", user_id).execute()
    db.supabase_admin.table("ideas").update({"status": "published"}).eq("author_id", user_id).eq("status", "draft").execute()
    db.log_admin_action(admin.email, "unban", "user", user_id)
    return {"message": "User unbanned"}


@router.post("/users/{user_id}/hard-delete")
async def hard_delete_user(user_id: str, body: dict, admin=Depends(require_admin)):
    confirm = body.get("confirm_username", "")
    profile = db.get_profile(user_id)
    if not profile or profile.get("username") != confirm:
        raise HTTPException(status_code=400, detail="Username confirmation does not match")
    db.supabase_admin.table("profiles").delete().eq("id", user_id).execute()
    try:
        db.supabase_admin.auth.admin.delete_user(user_id)
    except Exception:
        pass
    db.log_admin_action(admin.email, "hard_delete", "user", user_id, notes=f"confirmed as {confirm}")
    return {"message": "User permanently deleted"}
