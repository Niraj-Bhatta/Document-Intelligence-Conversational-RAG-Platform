
import os
from fastapi import FastAPI
from app.api.v1.chat import router as chat_router

from app.api.v1.documents import router as documents_router
from app.db.database import Base, engine
from app.db import models  # noqa: F401


from fastapi.middleware.cors import CORSMiddleware
# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Palm Mind RAG API",
    description="Document-based conversational RAG backend",
    version="1.0.0",
)

# Allow origins from env (comma-separated) or default to local dev & wildcard for preview
env_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [
    origin.strip()
    for origin in env_origins.split(",")
    if origin.strip()
] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https?://.*"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    documents_router,
    prefix="/api/v1",
)

app.include_router(chat_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "healthy",
        "application": "Palm Mind RAG API",
    }
