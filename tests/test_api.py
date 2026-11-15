import io
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_db, SessionLocal
from app.db.models import Document


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "application": "Palm Mind RAG API",
    }


def test_stats_summary(client):
    response = client.get("/api/v1/documents/stats/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data
    assert "total_chunks" in data
    assert "active_bookings" in data
    assert "total_vectors" in data
    assert "recent_documents" in data
    assert isinstance(data["recent_documents"], list)


def test_list_documents(client):
    response = client.get("/api/v1/documents/")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    if docs:
        first = docs[0]
        assert "document_id" in first
        assert "filename" in first
        assert "chunk_count" in first


def test_get_document_not_found(client):
    response = client.get("/api/v1/documents/non-existent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_delete_document_not_found(client):
    response = client.delete("/api/v1/documents/non-existent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_upload_invalid_extension(client):
    fake_file = io.BytesIO(b"binary data")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("malicious.exe", fake_file, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Only PDF and TXT files are supported" in response.json()["detail"]


def test_upload_empty_file(client):
    fake_file = io.BytesIO(b"")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("empty.txt", fake_file, "text/plain")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@patch("app.api.v1.documents.generate_document_embeddings")
@patch("app.api.v1.documents.get_vector_store")
def test_upload_duplicate_prevention(mock_get_vs, mock_gen_emb, client):
    mock_vs = MagicMock()
    mock_vs.store_chunks.return_value = 1
    mock_get_vs.return_value = mock_vs
    mock_gen_emb.return_value = [[0.1] * 384]

    test_content = b"This is a test document with unique content for duplicate testing."
    filename = "test_duplicate_check.txt"

    # Ensure document does not already exist
    db = SessionLocal()
    existing = db.query(Document).filter(Document.filename == filename).all()
    for doc in existing:
        db.delete(doc)
    db.commit()

    # First upload - should succeed
    res1 = client.post(
        "/api/v1/documents/upload",
        files={"file": (filename, io.BytesIO(test_content), "text/plain")},
        data={"chunking_strategy": "recursive"},
    )
    assert res1.status_code == 200
    doc_id = res1.json()["document_id"]

    try:
        # Second upload with same name and size - must be rejected
        res2 = client.post(
            "/api/v1/documents/upload",
            files={"file": (filename, io.BytesIO(test_content), "text/plain")},
            data={"chunking_strategy": "recursive"},
        )
        assert res2.status_code == 400
        assert "already exists" in res2.json()["detail"]
    finally:
        # Cleanup
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            db.delete(doc)
            db.commit()


def test_chat_empty_question(client):
    response = client.post(
        "/api/v1/chat/",
        json={"question": "   ", "conversation_id": "test-session"},
    )
    assert response.status_code == 422
    assert "empty" in str(response.json()).lower()


@patch("app.api.v1.chat.get_redis_client")
def test_conversation_history_endpoints(mock_redis_client, client):
    mock_redis = MagicMock()
    mock_redis.lrange.return_value = [
        '{"role": "user", "content": "Hello"}',
        '{"role": "assistant", "content": "Hi there!"}',
    ]
    mock_redis_client.return_value = mock_redis

    # Test history retrieval
    res = client.get("/api/v1/chat/history/test-session-123")
    assert res.status_code == 200
    data = res.json()
    assert data["conversation_id"] == "test-session-123"
    assert len(data["messages"]) == 2
    assert data["messages"][0]["content"] == "Hello"

    # Test history clearing
    res_del = client.delete("/api/v1/chat/history/test-session-123")
    assert res_del.status_code == 200
    assert res_del.json()["message"] == "Conversation history cleared."
    mock_redis.delete.assert_called_with("conversation:test-session-123")
