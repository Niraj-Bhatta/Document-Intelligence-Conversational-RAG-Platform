<div align="center">

# Palm Mind AI — Document Intelligence & Conversational RAG Platform

A production-ready full-stack AI platform combining **FastAPI**, **React 19**, **Retrieval-Augmented Generation (RAG)**, **Qdrant Vector Database**, **Redis Conversational Memory**, and **Google Gemini** for intelligent document analysis and autonomous interview booking.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626?style=flat&logo=qdrant&logoColor=white)](https://qdrant.tech)
[![Redis](https://img.shields.io/badge/Redis-Memory-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Pytest](https://img.shields.io/badge/Tests-10%2F10_Passing-brightgreen?style=flat&logo=pytest&logoColor=white)](https://pytest.org)

</div>

---

## 📌 Table of Contents

- [Overview & Key Features](#overview--key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Pipeline & Workflows](#pipeline--workflows)
  - [1. Document Ingestion & Deduplication](#1-document-ingestion--duplicate-prevention)
  - [2. Semantic Retrieval & RAG Answer Generation](#2-semantic-retrieval--rag-pipeline)
  - [3. Autonomous Interview Booking Flow](#3-autonomous-interview-booking-flow)
  - [4. Multi-Session Conversation Memory](#4-multi-session-conversation-memory)
- [Frontend Experience](#frontend-experience)
- [API Reference](#api-reference)
- [Testing & Validation](#testing--validation)
- [Deployment Guide](#deployment-guide)
- [Author & Links](#author--links)

---

## 🚀 Overview & Key Features

Palm Mind AI allows users to upload documents (PDF, TXT), ingest them into a vector knowledge base, and ask deep questions with citations grounded strictly in the source material. It also seamlessly handles natural-language candidate interview scheduling without breaking conversation context.

### 🌟 What's New & Upgraded:
1. **Dynamic Real-Time Dashboard**:
   - Live document count, chunk count, and indexed vector statistics directly from SQLite and Qdrant.
   - Recent documents list with instant upload/delete reflection.
   - Quick-status badges and interactive action controls.

2. **Complete Two-Tier Document Deletion**:
   - Deleting a document removes both its relational metadata from SQLite **and** all its associated embedding vectors from Qdrant.
   - Zero orphaned vectors remaining in storage.

3. **Intelligent Duplicate Prevention & Cleaner**:
   - Files with identical names and file sizes/content are detected and rejected upon upload.
   - Automated cleanup purged historical duplicate files and recovered vector storage.

4. **Enhanced RAG Retrieval & Source Deduplication**:
   - Over-fetches candidate chunks ($3\times$ limit) to ensure high coverage, then deduplicates redundant chunks by `(document_id, chunk_index)`.
   - Returns top-scoring unique chunks with source filenames, chunk indices, and cosine similarity scores.

5. **Multi-Session Conversation History**:
   - Persistent conversation memory backed by Redis.
   - Frontend session manager with local session storage, session switching, new session generation, and session clearing.

6. **Modern, Responsive Frontend (React 19 + Tailwind CSS v4)**:
   - Real-time toast notifications for upload, delete, and chat errors.
   - Skeleton loading states, smooth auto-scrolling chat, and mobile-friendly collapsible sidebar.

---

## 🏗️ System Architecture

```text
                           ┌────────────────────────┐
                           │      React 19 UI       │
                           │ (Vite + Tailwind CSS)  │
                           └───────────┬────────────┘
                                       │ HTTP / JSON
                                       ▼
                           ┌────────────────────────┐
                           │    FastAPI Backend     │
                           │   (Uvicorn ASGI App)   │
                           └─────┬────────────┬─────┘
                                 │            │
            ┌────────────────────┘            └────────────────────┐
            ▼                                                      ▼
  ┌───────────────────┐                                  ┌───────────────────┐
  │   Documents API   │                                  │     Chat API      │
  │   - Ingestion     │                                  │   - Hybrid RAG    │
  │   - Stats Summary │                                  │   - Booking Flow  │
  │   - CRUD Delete   │                                  │   - Multi-Session │
  └─────────┬─────────┘                                  └─────────┬─────────┘
            │                                                      │
     ┌──────┴──────┐                                        ┌──────┴──────┐
     ▼             ▼                                        ▼             ▼
┌─────────┐  ┌───────────┐                            ┌───────────┐ ┌───────────┐
│ PyMuPDF │  │ Chunking  │                            │ Retrieval │ │  Memory   │
│ Extract │  │ Recursive │                            │ Overfetch │ │  Service  │
└────┬────┘  └─────┬─────┘                            └─────┬─────┘ └─────┬─────┘
     └──────┬──────┘                                        │             │
            ▼                                               ▼             ▼
  ┌───────────────────┐                               ┌───────────┐ ┌───────────┐
  │   MiniLM-L6-v2    │                               │  Qdrant   │ │   Redis   │
  │ Local Embeddings  │                               │ Cloud DB  │ │  Memory   │
  └─────────┬─────────┘                               └─────┬─────┘ └─────┬─────┘
            ▼                                               └──────┬──────┘
  ┌───────────────────┐                                            ▼
  │  Qdrant Cloud DB  │                                   ┌─────────────────┐
  │  & SQLite Storage │                                   │  Gemini 1.5 LLM │
  └───────────────────┘                                   └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Lucide React, Axios |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic v2 |
| **Relational Database** | SQLite, SQLAlchemy ORM |
| **Vector Database** | Qdrant Cloud (Cosine Similarity, Keyword Payload Indexing) |
| **Embeddings** | Sentence Transformers (`all-MiniLM-L6-v2`, 384 dimensions) |
| **Large Language Model** | Google Gemini (`gemini-1.5-flash`) |
| **Memory & Cache** | Redis 7 (Conversation turns, booking states with 24h TTL) |
| **Document Processing** | PyMuPDF (PDF extraction), UTF-8 text decoding |
| **Testing & CI** | Pytest 9.2, FastAPI TestClient, Unittest Mock |
| **Containerization** | Docker, Docker Compose, Nginx Alpine |

---

## 📁 Directory Structure

```text
palm-mind-rag/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── chat.py             # Chat, RAG, and session history endpoints
│   │       └── documents.py        # Upload, stats, document detail & Qdrant delete
│   ├── core/                       # Core configuration and helpers
│   ├── db/
│   │   ├── database.py             # SQLite engine and session factory
│   │   └── models.py               # Document & Booking SQLAlchemy models
│   ├── schemas/
│   │   ├── booking.py              # Pydantic schemas for booking extraction
│   │   └── chat.py                 # Chat request & response schemas
│   ├── services/
│   │   ├── booking_service.py      # SQLite booking persistence
│   │   ├── booking_conversation_service.py # Multi-turn interview booking state machine
│   │   ├── chunking_service.py     # Recursive & token-based chunking
│   │   ├── embedding_service.py    # Local MiniLM-L6-v2 embedding generation
│   │   ├── extraction_service.py   # PyMuPDF PDF & TXT extraction
│   │   ├── llm_service.py          # Google Gemini integration
│   │   ├── memory_service.py       # Redis conversation memory & state management
│   │   ├── rag_service.py          # RAG pipeline with deduplication & source scoring
│   │   ├── retrieval_service.py    # Semantic search with document filtering
│   │   └── vector_store_service.py # Qdrant client, upsert, query & delete
│   └── main.py                     # FastAPI application setup & CORS configuration
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── chatService.js      # Chat & session history API calls
│   │   │   └── documentService.js  # Document CRUD & stats summary API calls
│   │   ├── App.jsx                 # Full dynamic dashboard & chat interface
│   │   ├── App.css
│   │   └── main.jsx
│   ├── Dockerfile                  # Multi-stage production build with Nginx
│   ├── nginx.conf                  # Nginx SPA routing & API reverse proxy
│   └── package.json
│
├── tests/
│   └── test_api.py                 # Pytest test suite (10 comprehensive tests)
│
├── Dockerfile                      # Production backend Dockerfile
├── docker-compose.yml              # Complete 4-service stack (backend, frontend, redis, qdrant)
├── requirements.txt
└── README.md
```

---

## 🔄 Pipeline & Workflows

### 1. Document Ingestion & Duplicate Prevention
1. **Validation**: Enforces allowed extensions (`.pdf`, `.txt`) and verifies non-empty payload.
2. **Duplicate Check**: Checks database for an existing document with the identical filename and file size/character count; rejects duplicates with an HTTP 400 error.
3. **Extraction & Chunking**: PyMuPDF extracts raw text; recursive chunking divides text into ~500 character chunks with 50 character overlaps.
4. **Embedding Generation**: Local `all-MiniLM-L6-v2` produces 384-dimensional dense vectors.
5. **Storage**: Chunks and metadata are stored in Qdrant with payload indexing on `document_id`; relational record is stored in SQLite.

### 2. Semantic Retrieval & RAG Pipeline
1. User question is converted into a 384-dimensional query vector.
2. Qdrant performs cosine similarity search.
3. Candidate chunks are over-fetched ($3\times$) and deduplicated by `(document_id, chunk_index)` to avoid repetitive passages.
4. Retrieved passages + conversation history + user query are composed into a strict grounded prompt for Google Gemini.
5. Returns answer along with source document filename, chunk index, and similarity scores.

### 3. Autonomous Interview Booking Flow
1. Detects booking intent (e.g., *"I want to schedule my interview"*).
2. Uses Gemini with structured extraction to parse Candidate Name, Email, and Preferred Interview Date/Time.
3. Redis maintains conversational state across turns (`collecting` ➔ `awaiting_confirmation` ➔ `confirmed`).
4. Upon user confirmation, persists record into SQLite `bookings` table.

---

## 💻 Frontend Experience

- **Overview Dashboard**: Live counters for total documents, knowledge chunks, Qdrant vectors, and confirmed bookings.
- **Recent Uploads**: Displays last 5 documents with timestamps, chunk sizes, and statuses.
- **Document Management**: Search filter, chunking strategy toggle, document inspection modal, and delete with instant vector removal.
- **Session-Based AI Chat**: Switch between multiple chat sessions or clear history on demand.
- **Toast Notifications & Feedback**: Inline loading animations, error messages, and success toasts.

---

## 📡 API Reference

### Document Endpoints (`/api/v1/documents`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stats/summary` | Live dashboard metrics (total docs, chunks, vectors, bookings, recent docs) |
| `GET` | `/` | List all uploaded documents with metadata |
| `GET` | `/{document_id}` | Retrieve details for a specific document |
| `POST` | `/upload` | Upload PDF/TXT, generate embeddings, prevent duplicates |
| `DELETE` | `/{document_id}` | Purge vectors from Qdrant and delete metadata from SQLite |

### Chat Endpoints (`/api/v1/chat`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Ask question with RAG or continue interview booking |
| `GET` | `/history/{conversation_id}` | Retrieve stored conversation history from Redis |
| `DELETE` | `/history/{conversation_id}` | Clear conversation history for a session |

### System Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API health check and status verification |

---

## 🧪 Testing & Validation

Run the automated test suite with pytest:

```bash
# Run all tests
pytest tests/test_api.py -v
```

### Test Coverage Highlights:
- ✅ **Health Check**: Validates `/health` returns status healthy.
- ✅ **Stats Summary**: Validates `/stats/summary` returns live counts and recent document list.
- ✅ **Document Listing & Retrieval**: Validates listing and 404 handling.
- ✅ **File Upload Validation**: Rejects unsupported extensions (`.exe`) and empty files.
- ✅ **Duplicate Prevention**: Confirms uploading an identical file twice is rejected with HTTP 400.
- ✅ **Two-Tier Deletion**: Verifies Qdrant vector deletion and SQLite removal.
- ✅ **Input Validation**: Verifies empty question strings return HTTP 422.
- ✅ **Redis Conversation History**: Verifies retrieval and clearing of conversation turns.

---

## 🚢 Deployment Guide

### Option 1: Docker Compose (All-in-One Local or VPS)

```bash
# 1. Clone repository and navigate
git clone https://github.com/Niraj-Bhatta/palm-mind-rag.git
cd palm-mind-rag

# 2. Configure .env file
cp .env.example .env
# Set your GEMINI_API_KEY, QDRANT_URL, etc.

# 3. Build and run all services
docker compose up --build -d
```
- Frontend available at: `http://localhost:3000`
- Backend API available at: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`

### Option 2: Cloud Deployment (Render / Railway / Vercel)

1. **Backend (Render or Railway)**:
   - Root directory: `./`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add Environment Variables: `GEMINI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

2. **Frontend (Vercel, Netlify, or Render)**:
   - Root directory: `./frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_API_BASE_URL=https://your-backend-url.onrender.com/api/v1`

---

## 👤 Author

**Niraj Bhatta**  
AI & Software Engineer  
- **GitHub**: [github.com/Niraj-Bhatta](https://github.com/Niraj-Bhatta)  
- **Portfolio**: [nirajbhatta.info.np](https://nirajbhatta.info.np)  

---

<div align="center">
Built with dedication for Palm Mind AI.
</div>
