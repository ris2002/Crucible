from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from services import supabase_service as db

router = APIRouter()


@router.post("/comments/{comment_id}/spark")
async def spark_comment(comment_id: str, user=Depends(get_current_user)):
    existing = db.supabase_admin.table("sparks").select("id").eq("user_id", user.id).eq("comment_id", comment_id).execute()

    if existing.data:
        db.supabase_admin.table("sparks").delete().eq("user_id", user.id).eq("comment_id", comment_id).execute()
        db.supabase_admin.table("comments").update({"spark_count": db.supabase_admin.rpc("get_comment_spark_count", {"comment_id_param": comment_id})}).eq("id", comment_id).execute()
        sparked = False
    else:
        db.supabase_admin.table("sparks").insert({"user_id": user.id, "comment_id": comment_id}).execute()
        sparked = True

    comment = db.supabase_admin.table("comments").select("spark_count").eq("id", comment_id).single().execute()
    spark_count = comment.data.get("spark_count", 0) if comment.data else 0

    return {"sparked": sparked, "spark_count": spark_count}


@router.post("/comments/{comment_id}/report")
async def report_comment(comment_id: str, body: dict, user=Depends(get_current_user)):
    reason = body.get("reason", "Abusive content")
    db.supabase_admin.table("reports").insert({
        "reporter_id": user.id,
        "comment_id": comment_id,
        "reason": reason,
    }).execute()
    return {"message": "Comment reported"}
