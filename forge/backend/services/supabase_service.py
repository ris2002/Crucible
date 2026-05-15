import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_admin: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


def get_profile(user_id: str):
    result = supabase_admin.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    return result.data


def get_profile_by_username(username: str):
    result = supabase_admin.table("profiles").select("*").eq("username", username).single().execute()
    return result.data


def create_profile(user_id: str, username: str):
    result = supabase_admin.table("profiles").insert({
        "id": user_id,
        "username": username,
        "tier": "free",
        "credits_remaining": 3,
        "credits_monthly": 3,
        "lifetime_sessions_used": 0,
    }).execute()
    return result.data[0] if result.data else None


def update_profile(user_id: str, updates: dict):
    result = supabase_admin.table("profiles").update(updates).eq("id", user_id).execute()
    return result.data


def get_max_turns(tier: str) -> int:
    if tier == "free":
        return 7
    if tier == "thinker":
        return 10
    if tier == "scholar":
        return 12
    if tier == "alchemist":
        return 999
    if tier == "admin":
        return 10
    return 7


def get_user_ai_config(user_id: str):
    result = supabase_admin.table("profiles").select("llm_api_key,llm_provider,llm_model").eq("id", user_id).maybe_single().execute()
    if not result.data:
        return None, None, None
    return result.data.get("llm_api_key"), result.data.get("llm_provider", "anthropic"), result.data.get("llm_model")


def get_user_api_key(user_id: str):
    key, _, _ = get_user_ai_config(user_id)
    return key


def store_user_ai_config(user_id: str, key: str, provider: str, model: str):
    supabase_admin.table("profiles").update({
        "llm_api_key": key,
        "llm_provider": provider,
        "llm_model": model,
    }).eq("id", user_id).execute()


def delete_user_api_key(user_id: str):
    supabase_admin.table("profiles").update({"llm_api_key": None, "llm_provider": None, "llm_model": None}).eq("id", user_id).execute()


def get_ideas(domain: str = None, genre: str = None, sort: str = "recent",
              page: int = 1, following: bool = False, follower_id: str = None,
              username: str = None, date_from: str = None, date_to: str = None):
    query = supabase_admin.table("ideas").select(
        "*, profiles!ideas_author_id_fkey(username, tier)"
    ).eq("status", "published")

    if domain:
        query = query.eq("domain", domain)
    if genre:
        query = query.eq("genre", genre)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        # include the full end day
        query = query.lte("created_at", date_to + "T23:59:59Z")

    if username:
        profile = supabase_admin.table("profiles").select("id").eq("username", username).maybe_single().execute()
        if profile.data:
            query = query.eq("author_id", profile.data["id"])
        else:
            return [], 0

    if following and follower_id:
        following_ids = get_following_ids(follower_id)
        if following_ids:
            query = query.in_("author_id", following_ids)
        else:
            return [], 0

    if sort == "sparked":
        query = query.order("spark_count", desc=True)
    else:
        query = query.order("created_at", desc=True)

    offset = (page - 1) * 20
    count_result = supabase_admin.table("ideas").select("id", count="exact").eq("status", "published")
    if domain:
        count_result = count_result.eq("domain", domain)
    if genre:
        count_result = count_result.eq("genre", genre)
    if date_from:
        count_result = count_result.gte("created_at", date_from)
    if date_to:
        count_result = count_result.lte("created_at", date_to + "T23:59:59Z")
    if username:
        profile = supabase_admin.table("profiles").select("id").eq("username", username).maybe_single().execute()
        if profile.data:
            count_result = count_result.eq("author_id", profile.data["id"])
    total = count_result.execute().count or 0

    result = query.range(offset, offset + 19).execute()
    return result.data, total


def get_idea(idea_id: str):
    result = supabase_admin.table("ideas").select(
        "*, profiles!ideas_author_id_fkey(username, tier)"
    ).eq("id", idea_id).single().execute()
    return result.data


def create_idea(author_id: str, title: str, summary: str, domain: str,
                genre: str, tags: list, built_on_idea_id: str = None, session_id: str = None):
    data = {
        "author_id": author_id,
        "title": title,
        "summary": summary,
        "domain": domain,
        "genre": genre,
        "tags": tags,
        "status": "published",
    }
    if built_on_idea_id:
        data["built_on_idea_id"] = built_on_idea_id
    result = supabase_admin.table("ideas").insert(data).execute()
    idea = result.data[0] if result.data else None

    if idea and built_on_idea_id:
        supabase_admin.table("ideas").update(
            {"build_count": supabase_admin.rpc("increment", {"row_id": built_on_idea_id, "col": "build_count"})}
        )

    if session_id and idea:
        supabase_admin.table("forge_sessions").update({
            "status": "posted",
            "idea_id": idea["id"]
        }).eq("id", session_id).execute()

    return idea


def toggle_spark(user_id: str, idea_id: str):
    existing = supabase_admin.table("sparks").select("id").eq("user_id", user_id).eq("idea_id", idea_id).execute()
    if existing.data:
        supabase_admin.table("sparks").delete().eq("user_id", user_id).eq("idea_id", idea_id).execute()
        supabase_admin.rpc("decrement_spark_count", {"idea_id_param": idea_id}).execute()
        sparked = False
    else:
        supabase_admin.table("sparks").insert({"user_id": user_id, "idea_id": idea_id}).execute()
        supabase_admin.rpc("increment_spark_count", {"idea_id_param": idea_id}).execute()
        sparked = True

    idea = get_idea(idea_id)
    return sparked, idea.get("spark_count", 0) if idea else 0


def get_user_sparks(user_id: str, idea_ids: list) -> set:
    if not idea_ids:
        return set()
    result = supabase_admin.table("sparks").select("idea_id").eq("user_id", user_id).in_("idea_id", idea_ids).execute()
    return {r["idea_id"] for r in result.data}


def get_comments(idea_id: str, page: int = 1):
    offset = (page - 1) * 20
    result = supabase_admin.table("comments").select(
        "*, profiles!comments_author_id_fkey(username, tier)"
    ).eq("idea_id", idea_id).is_("parent_id", None).order("created_at", desc=False).range(offset, offset + 19).execute()

    top_level = result.data or []
    if top_level:
        comment_ids = [c["id"] for c in top_level]
        replies = supabase_admin.table("comments").select(
            "*, profiles!comments_author_id_fkey(username, tier)"
        ).in_("parent_id", comment_ids).order("created_at", desc=False).execute()
        replies_by_parent = {}
        for r in (replies.data or []):
            pid = r["parent_id"]
            replies_by_parent.setdefault(pid, []).append(r)
        for c in top_level:
            c["replies"] = replies_by_parent.get(c["id"], [])

    return top_level


def create_comment(author_id: str, idea_id: str, content: str, word_count: int, parent_id: str = None):
    data = {
        "author_id": author_id,
        "idea_id": idea_id,
        "content": content,
        "word_count": word_count,
    }
    if parent_id:
        data["parent_id"] = parent_id
    result = supabase_admin.table("comments").insert(data).execute()
    supabase_admin.rpc("increment_comment_count", {"idea_id_param": idea_id}).execute()
    return result.data[0] if result.data else None


def get_following_ids(user_id: str) -> list:
    result = supabase_admin.table("follows").select("following_id").eq("follower_id", user_id).execute()
    return [r["following_id"] for r in result.data]


def toggle_follow(follower_id: str, following_id: str):
    existing = supabase_admin.table("follows").select("follower_id").eq("follower_id", follower_id).eq("following_id", following_id).execute()
    if existing.data:
        supabase_admin.table("follows").delete().eq("follower_id", follower_id).eq("following_id", following_id).execute()
        return False
    else:
        supabase_admin.table("follows").insert({"follower_id": follower_id, "following_id": following_id}).execute()
        create_notification(following_id, "follow", actor_id=follower_id)
        return True


def is_following(follower_id: str, following_id: str) -> bool:
    result = supabase_admin.table("follows").select("follower_id").eq("follower_id", follower_id).eq("following_id", following_id).execute()
    return bool(result.data)


def get_follower_count(user_id: str) -> int:
    result = supabase_admin.table("follows").select("follower_id", count="exact").eq("following_id", user_id).execute()
    return result.count or 0


def get_following_count(user_id: str) -> int:
    result = supabase_admin.table("follows").select("following_id", count="exact").eq("follower_id", user_id).execute()
    return result.count or 0


def get_user_ideas(username: str, page: int = 1):
    profile = get_profile_by_username(username)
    if not profile:
        return [], 0
    offset = (page - 1) * 20
    result = supabase_admin.table("ideas").select("*").eq("author_id", profile["id"]).eq("status", "published").order("created_at", desc=True).range(offset, offset + 19).execute()
    count = supabase_admin.table("ideas").select("id", count="exact").eq("author_id", profile["id"]).eq("status", "published").execute().count or 0
    return result.data, count


def create_forge_session(user_id: str, domain: str, genre: str, built_on_idea_id: str = None):
    data = {
        "user_id": user_id,
        "domain": domain,
        "genre": genre,
        "messages": [],
        "turns_used": 0,
        "status": "active",
    }
    if built_on_idea_id:
        data["built_on_idea_id"] = built_on_idea_id
    result = supabase_admin.table("forge_sessions").insert(data).execute()
    return result.data[0] if result.data else None


def get_forge_session(session_id: str, user_id: str = None):
    query = supabase_admin.table("forge_sessions").select("*").eq("id", session_id)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.single().execute()
    return result.data


def update_forge_session(session_id: str, updates: dict):
    from datetime import datetime, timezone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase_admin.table("forge_sessions").update(updates).eq("id", session_id).execute()
    return result.data


def get_draft_sessions(user_id: str):
    result = supabase_admin.table("forge_sessions").select("*").eq("user_id", user_id).in_("status", ["active", "draft"]).order("updated_at", desc=True).execute()
    return result.data


def deduct_credit(user_id: str):
    profile = get_profile(user_id)
    if not profile or profile["credits_remaining"] <= 0:
        return False
    supabase_admin.table("profiles").update({
        "credits_remaining": profile["credits_remaining"] - 1,
        "lifetime_sessions_used": profile["lifetime_sessions_used"] + 1,
    }).eq("id", user_id).execute()
    supabase_admin.table("credit_transactions").insert({
        "user_id": user_id,
        "amount": -1,
        "type": "post",
        "description": "Posted idea to feed",
    }).execute()
    return True


def get_notifications(user_id: str):
    result = supabase_admin.table("notifications").select(
        "*, actor:profiles!notifications_actor_id_fkey(username), ideas(title)"
    ).eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
    return result.data


def mark_notifications_read(user_id: str, ids: list):
    supabase_admin.table("notifications").update({"read": True}).eq("user_id", user_id).in_("id", ids).execute()


def create_notification(user_id: str, type: str, actor_id: str = None, idea_id: str = None, comment_id: str = None):
    if user_id == actor_id:
        return
    data = {"user_id": user_id, "type": type}
    if actor_id:
        data["actor_id"] = actor_id
    if idea_id:
        data["idea_id"] = idea_id
    if comment_id:
        data["comment_id"] = comment_id
    supabase_admin.table("notifications").insert(data).execute()


def create_flag(idea_id: str, reason: str, triggered_by: str, reporter_id: str = None, reason_detail: str = None):
    data = {"idea_id": idea_id, "reason": reason, "triggered_by": triggered_by}
    if reporter_id:
        data["reporter_id"] = reporter_id
    if reason_detail:
        data["reason_detail"] = reason_detail
    try:
        supabase_admin.table("flagged_content").insert(data).execute()
    except Exception:
        pass

    try:
        from services.email_service import send_flag_alert
        idea = supabase_admin.table("ideas").select("title").eq("id", idea_id).maybe_single().execute()
        idea_title = idea.data.get("title", idea_id) if idea.data else idea_id
        reporter_username = None
        if reporter_id:
            rep = supabase_admin.table("profiles").select("username").eq("id", reporter_id).maybe_single().execute()
            reporter_username = rep.data.get("username") if rep.data else None
        send_flag_alert(triggered_by, reason, idea_title, idea_id, reporter_username, reason_detail)
    except Exception as e:
        print(f"[flag email] {e}")


def get_app_settings() -> dict:
    result = supabase_admin.table("app_settings").select("purchases_enabled,upgrades_enabled,cost_reset_at").eq("id", 1).maybe_single().execute()
    if result.data:
        return {
            "purchases_enabled": result.data.get("purchases_enabled", True),
            "upgrades_enabled": result.data.get("upgrades_enabled", True),
            "cost_reset_at": result.data.get("cost_reset_at"),
        }
    return {"purchases_enabled": True, "upgrades_enabled": True, "cost_reset_at": None}


def get_purchases_enabled() -> bool:
    return get_app_settings()["purchases_enabled"]


def get_upgrades_enabled() -> bool:
    return get_app_settings()["upgrades_enabled"]


def set_app_settings(updates: dict):
    supabase_admin.table("app_settings").upsert({"id": 1, **updates}).execute()


def log_admin_action(admin_email: str, action_type: str, target_type: str, target_id: str, notes: str = None):
    supabase_admin.table("admin_actions").insert({
        "admin_email": admin_email,
        "action_type": action_type,
        "target_type": target_type,
        "target_id": target_id,
        "notes": notes,
    }).execute()
