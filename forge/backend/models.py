from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class CrucibleStartRequest(BaseModel):
    domain: str
    genre: str
    built_on_idea_id: Optional[str] = None


class CrucibleMessageRequest(BaseModel):
    session_id: str
    message: str


class CruciblePostRequest(BaseModel):
    session_id: str
    title: str
    summary: str
    tags: List[str]


class CrucibleSaveDraftRequest(BaseModel):
    session_id: str


class CrucibleExtendRequest(BaseModel):
    session_id: str


class CommentCreateRequest(BaseModel):
    content: str
    parent_id: Optional[str] = None


class MarkReadRequest(BaseModel):
    ids: List[str]


class SubscribeRequest(BaseModel):
    tier: str  # 'thinker' or 'scholar'


class ExtendTurnsRequest(BaseModel):
    session_id: str


class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = None


class CrucibleSessionResponse(BaseModel):
    session_id: str
    turns_used: int
    max_turns: int
    domain: str
    genre: str
    messages: list
    status: str
    draft_title: Optional[str] = None
    draft_summary: Optional[str] = None
    draft_tags: Optional[List[str]] = None


class CrucibleMessageResponse(BaseModel):
    reply: str
    turns_used: int
    max_turns: int
    forge_ready: bool
    draft_title: Optional[str] = None
    draft_summary: Optional[str] = None
    draft_tags: Optional[List[str]] = None
    warning: bool = False
