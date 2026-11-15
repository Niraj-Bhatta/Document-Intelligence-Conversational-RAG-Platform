import logging

from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import answer_question

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.memory_service import get_redis_client, ConversationMemory

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post("/", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:

    try:
        result = answer_question(
            question=request.question,
            limit=request.limit,
            document_id=request.document_id,
            conversation_id=request.conversation_id,
            db=db,
        )

        return ChatResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        logger.exception("Chat request failed")

        raise HTTPException(
            status_code=500,
            detail="Failed to generate an answer.",
        ) from error


@router.get("/history/{conversation_id}")
def get_conversation_history(conversation_id: str) -> dict:
    """Return stored conversation messages for a given session."""

    try:
        redis_client = get_redis_client()
        memory = ConversationMemory(redis_client)
        messages = memory.get_history(
            conversation_id=conversation_id,
            limit=50,
        )
        return {
            "conversation_id": conversation_id,
            "messages": messages,
            "count": len(messages),
        }
    except Exception as error:
        logger.exception("Failed to retrieve conversation history")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve conversation history.",
        ) from error


@router.delete("/history/{conversation_id}")
def clear_conversation_history(conversation_id: str) -> dict:
    """Delete all messages in a conversation session from Redis."""

    try:
        redis_client = get_redis_client()
        key = f"conversation:{conversation_id}"
        redis_client.delete(key)
        return {
            "message": "Conversation history cleared.",
            "conversation_id": conversation_id,
        }
    except Exception as error:
        logger.exception("Failed to clear conversation history")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear conversation history.",
        ) from error