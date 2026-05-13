import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from middleware.auth import get_current_user
from models import (
    CrucibleStartRequest, CrucibleMessageRequest, CruciblePostRequest,
    CrucibleSaveDraftRequest, CrucibleExtendRequest
)
from services import supabase_service as db
from services import anthropic_service as ai
from services import stripe_service as stripe_svc

router = APIRouter()


@router.post("/start")
async def start_forge_session(body: CrucibleStartRequest, user=Depends(get_current_user)):
    profile = db.get_profile(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile["credits_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    built_on_idea = None
    if body.built_on_idea_id:
        built_on_idea = db.get_idea(body.built_on_idea_id)

    session = db.create_forge_session(user.id, body.domain, body.genre, body.built_on_idea_id)
    if not session:
        raise HTTPException(status_code=500, detail="Failed to create session")

    max_turns = db.get_max_turns(profile["tier"])

    return {
        "session_id": session["id"],
        "turns_used": 0,
        "max_turns": max_turns,
        "domain": body.domain,
        "genre": body.genre,
        "messages": [],
        "status": "active",
        "built_on": {
            "id": built_on_idea["id"],
            "title": built_on_idea["title"],
        } if built_on_idea else None,
    }


@router.post("/message")
async def send_forge_message(body: CrucibleMessageRequest, user=Depends(get_current_user)):
    if len(body.message.split()) > 500:
        raise HTTPException(status_code=400, detail="Message exceeds 500-word limit")

    session = db.get_forge_session(body.session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] == "posted":
        raise HTTPException(status_code=400, detail="Session already posted")

    profile = db.get_profile(user.id)
    max_turns = session.get("max_turns_extended") or db.get_max_turns(profile["tier"])
    turns_used = session["turns_used"]

    if turns_used >= max_turns:
        raise HTTPException(status_code=400, detail="Turn limit reached")

    messages = session.get("messages") or []
    messages.append({"role": "user", "content": body.message})

    built_on_idea_id = session.get("built_on_idea_id")
    build_context = None
    if built_on_idea_id:
        original = db.get_idea(built_on_idea_id)
        if original:
            build_context = f"You are building on the idea titled '{original['title']}' by {original.get('profiles', {}).get('username', 'another user')}."

    try:
        reply, input_tokens, output_tokens = ai.get_forge_response(messages, session["domain"], session["genre"], build_context)
    except Exception as e:
        print(f"[forge/message error] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    draft_data, clean_reply = ai.parse_forge_ready(reply)
    forge_ready = draft_data is not None

    messages.append({"role": "assistant", "content": clean_reply if forge_ready else reply})
    turns_used += 1

    warning_turn = max_turns - 1
    warning = (turns_used == warning_turn) and not forge_ready

    ai_redirect = "that framing is more heat than light" in reply.lower()

    updates = {
        "messages": messages,
        "turns_used": turns_used,
        "input_tokens": (session.get("input_tokens") or 0) + input_tokens,
        "output_tokens": (session.get("output_tokens") or 0) + output_tokens,
    }
    if ai_redirect:
        updates["ai_redirect_triggered"] = True
    if forge_ready:
        updates["draft_title"] = draft_data["title"]
        updates["draft_summary"] = draft_data["summary"]
        updates["draft_tags"] = draft_data["tags"]
        updates["status"] = "draft"

    db.update_forge_session(body.session_id, updates)

    return {
        "reply": clean_reply if forge_ready else reply,
        "turns_used": turns_used,
        "max_turns": max_turns,
        "forge_ready": forge_ready,
        "draft_title": draft_data["title"] if forge_ready else None,
        "draft_summary": draft_data["summary"] if forge_ready else None,
        "draft_tags": draft_data["tags"] if forge_ready else None,
        "warning": warning,
    }


@router.post("/stream")
async def stream_forge_message(body: CrucibleMessageRequest, user=Depends(get_current_user)):
    if len(body.message.split()) > 500:
        raise HTTPException(status_code=400, detail="Message exceeds 500-word limit")

    session = db.get_forge_session(body.session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] == "posted":
        raise HTTPException(status_code=400, detail="Session already posted")

    profile = db.get_profile(user.id)
    max_turns = session.get("max_turns_extended") or db.get_max_turns(profile["tier"])
    turns_used = session["turns_used"]

    if turns_used >= max_turns:
        raise HTTPException(status_code=400, detail="Turn limit reached")

    history = list(session.get("messages") or [])
    history.append({"role": "user", "content": body.message})

    built_on_idea_id = session.get("built_on_idea_id")
    build_context = None
    if built_on_idea_id:
        original = db.get_idea(built_on_idea_id)
        if original:
            build_context = f"You are building on the idea titled '{original['title']}' by {original.get('profiles', {}).get('username', 'another user')}."

    system = ai.build_system_prompt(session["domain"], session["genre"], build_context)

    session_snapshot = dict(session)

    async def event_generator():
        accumulated = ""
        input_tokens = 0
        output_tokens = 0
        try:
            async with ai.async_client.messages.stream(
                model=ai.MODEL,
                max_tokens=1000,
                system=system,
                messages=history,
            ) as stream:
                async for text in stream.text_stream:
                    accumulated += text
                    yield f"data: {json.dumps({'text': text})}\n\n"
                final_msg = await stream.get_final_message()
                input_tokens = getattr(final_msg.usage, "input_tokens", 0)
                output_tokens = getattr(final_msg.usage, "output_tokens", 0)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        draft_data, clean_reply = ai.parse_forge_ready(accumulated)
        forge_ready = draft_data is not None
        new_turns = turns_used + 1
        warning = (new_turns == max_turns - 1) and not forge_ready
        ai_redirect = "that framing is more heat than light" in accumulated.lower()

        history.append({"role": "assistant", "content": clean_reply if forge_ready else accumulated})

        updates = {
            "messages": history,
            "turns_used": new_turns,
            "input_tokens": (session_snapshot.get("input_tokens") or 0) + input_tokens,
            "output_tokens": (session_snapshot.get("output_tokens") or 0) + output_tokens,
        }
        if ai_redirect:
            updates["ai_redirect_triggered"] = True
        if forge_ready:
            updates["draft_title"] = draft_data["title"]
            updates["draft_summary"] = draft_data["summary"]
            updates["draft_tags"] = draft_data["tags"]
            updates["status"] = "draft"

        db.update_forge_session(body.session_id, updates)

        done_payload = {
            "done": True,
            "turns_used": new_turns,
            "max_turns": max_turns,
            "forge_ready": forge_ready,
            "warning": warning,
        }
        if forge_ready:
            done_payload["draft_title"] = draft_data["title"]
            done_payload["draft_summary"] = draft_data["summary"]
            done_payload["draft_tags"] = draft_data["tags"]

        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/post")
async def post_idea(body: CruciblePostRequest, user=Depends(get_current_user)):
    session = db.get_forge_session(body.session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] == "posted":
        raise HTTPException(status_code=400, detail="Already posted")

    if not db.deduct_credit(user.id):
        raise HTTPException(status_code=402, detail="No credits remaining")

    idea = db.create_idea(
        author_id=user.id,
        title=body.title,
        summary=body.summary,
        domain=session["domain"],
        genre=session["genre"],
        tags=body.tags,
        built_on_idea_id=session.get("built_on_idea_id"),
        session_id=body.session_id,
    )

    if not idea:
        db.update_forge_session(body.session_id, {"status": "active"})
        raise HTTPException(status_code=500, detail="Failed to create idea")

    if session.get("built_on_idea_id"):
        original = db.get_idea(session["built_on_idea_id"])
        if original:
            db.create_notification(original["author_id"], "build", actor_id=user.id, idea_id=idea["id"])

    followers_result = db.supabase_admin.table("follows").select("follower_id").eq("following_id", user.id).execute()
    for f in (followers_result.data or []):
        db.create_notification(f["follower_id"], "new_idea_from_follow", actor_id=user.id, idea_id=idea["id"])

    # Auto-flag: AI redirect was triggered during session
    if session.get("ai_redirect_triggered"):
        db.create_flag(idea["id"], reason="ai_redirect", triggered_by="system")

    # Auto-flag: keyword match
    HATE_TERMS = ["nigger", "nigga", "faggot", "kike", "spic", "chink", "wetback", "raghead", "coon", "gook", "tranny"]
    combined = (body.title + " " + body.summary).lower()
    if any(term in combined for term in HATE_TERMS):
        db.create_flag(idea["id"], reason="keyword_match", triggered_by="system")

    return {"idea_id": idea["id"], "message": "Idea posted successfully"}


@router.post("/save-draft")
async def save_draft(body: CrucibleSaveDraftRequest, user=Depends(get_current_user)):
    session = db.get_forge_session(body.session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.update_forge_session(body.session_id, {"status": "draft"})
    return {"message": "Draft saved"}


@router.post("/extend")
async def extend_session(body: CrucibleExtendRequest, user=Depends(get_current_user)):
    session = db.get_forge_session(body.session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    url, checkout_id = stripe_svc.create_turn_extension_checkout(user.id, body.session_id, frontend_url)
    return {"checkout_url": url, "checkout_id": checkout_id}


@router.get("/drafts")
async def get_drafts(user=Depends(get_current_user)):
    drafts = db.get_draft_sessions(user.id)
    return {"drafts": drafts}


@router.get("/session/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    session = db.get_forge_session(session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    profile = db.get_profile(user.id)
    max_turns = session.get("max_turns_extended") or db.get_max_turns(profile["tier"])
    session["max_turns"] = max_turns
    return session
