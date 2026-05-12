from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class ForgeStartRequest(BaseModel):
    domain: str
    genre: str
    built_on_idea_id: Optional[str] = None


class ForgeMessageRequest(BaseModel):
    session_id: str
    message: str


class ForgePostRequest(BaseModel):
    session_id: str
    title: str
    summary: str
    tags: List[str]


class ForgeSaveDraftRequest(BaseModel):
    session_id: str


class ForgeExtendRequest(BaseModel):
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


class ForgeSessionResponse(BaseModel):
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


class ForgeMessageResponse(BaseModel):
    reply: str
    turns_used: int
    max_turns: int
    forge_ready: bool
    draft_title: Optional[str] = None
    draft_summary: Optional[str] = None
    draft_tags: Optional[List[str]] = None
    warning: bool = False
