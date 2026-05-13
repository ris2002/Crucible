import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import forge, ideas, users, comments, credits, payments, admin

app = FastAPI(title="Crucible API", version="1.0.0")

frontend_urls = [u.strip() for u in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forge.router, prefix="/forge", tags=["crucible"])
app.include_router(ideas.router, prefix="/ideas", tags=["ideas"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(comments.router, tags=["comments"])
app.include_router(credits.router, tags=["credits"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
async def health():
    return {"status": "ok"}
