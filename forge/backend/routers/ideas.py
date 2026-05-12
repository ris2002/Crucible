from fastapi import APIRouter, Depends, Query
from typing import Optional
from middleware.auth import get_current_user, get_optional_user
from services import supabase_service as db

router = APIRouter()


@router.get("")
async def get_feed(
    domain: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    sort: str = Query("recent"),
    page: int = Query(1, ge=1),
    following: bool = Query(False),
    username: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user=Depends(get_optional_user),
):
    follower_id = user.id if user and following else None
    ideas, total = db.get_ideas(domain, genre, sort, page, following, follower_id, username, date_from, date_to)

    pages = (total + 19) // 20

    user_sparks = set()
    if user and ideas:
        idea_ids = [i["id"] for i in ideas]
        user_sparks = db.get_user_sparks(user.id, idea_ids)

    for idea in ideas:
        idea["user_has_sparked"] = idea["id"] in user_sparks
        author = idea.pop("profiles", {}) or {}
        idea["author_username"] = author.get("username", "unknown")
        idea["author_tier"] = author.get("tier", "free")

    return {
        "ideas": ideas,
        "total": total,
        "page": page,
        "pages": pages,
        "per_page": 20,
    }


@router.get("/{idea_id}")
async def get_idea(idea_id: str, user=Depends(get_optional_user)):
    idea = db.get_idea(idea_id)
    if not idea:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Idea not found")

    author = idea.pop("profiles", {}) or {}
    idea["author_username"] = author.get("username", "unknown")
    idea["author_tier"] = author.get("tier", "free")

    if user:
        sparked_set = db.get_user_sparks(user.id, [idea_id])
        idea["user_has_sparked"] = idea_id in sparked_set
        idea["is_author"] = user.id == idea.get("author_id")
    else:
        idea["user_has_sparked"] = False
        idea["is_author"] = False

    if idea.get("built_on_idea_id"):
        parent = db.get_idea(idea["built_on_idea_id"])
        if parent:
            parent_author = parent.pop("profiles", {}) or {}
            idea["built_on"] = {
                "id": parent["id"],
                "title": parent["title"],
                "author_username": parent_author.get("username", "unknown"),
            }

    return idea


@router.post("/{idea_id}/spark")
async def spark_idea(idea_id: str, user=Depends(get_current_user)):
    idea = db.get_idea(idea_id)
    if not idea:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Idea not found")

    sparked, spark_count = db.toggle_spark(user.id, idea_id)

    if sparked:
        db.create_notification(idea["author_id"], "spark", actor_id=user.id, idea_id=idea_id)

    return {"sparked": sparked, "spark_count": spark_count}


@router.get("/{idea_id}/comments")
async def get_comments(idea_id: str, page: int = Query(1, ge=1)):
    comments = db.get_comments(idea_id, page)
    return {"comments": comments}


@router.post("/{idea_id}/report")
async def report_idea(idea_id: str, body: dict, user=Depends(get_current_user)):
    from fastapi import HTTPException
    idea = db.get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    reason = body.get("reason", "user_report")
    reason_detail = body.get("reason_detail", "")
    db.create_flag(idea_id, reason=reason, triggered_by="user", reporter_id=user.id, reason_detail=reason_detail)
    return {"message": "Reported"}


@router.post("/{idea_id}/comments")
async def post_comment(idea_id: str, body: dict, user=Depends(get_current_user)):
    from fastapi import HTTPException
    content = body.get("content", "").strip()
    parent_id = body.get("parent_id")
    word_count = len(content.split())

    if word_count < 50:
        raise HTTPException(status_code=400, detail=f"Comment must be at least 50 words (currently {word_count})")

    idea = db.get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    comment = db.create_comment(user.id, idea_id, content, word_count, parent_id)
    if not comment:
        raise HTTPException(status_code=500, detail="Failed to create comment")

    db.create_notification(idea["author_id"], "comment", actor_id=user.id, idea_id=idea_id, comment_id=comment["id"])
    return comment
