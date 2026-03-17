# FinAgent AI 

Beginner-friendly personal finance backend using Django, MongoDB, vector search, and RAG.

## Project Overview
FinAgent AI is a backend-first personal finance assistant. It stores transaction data in MongoDB, retrieves relevant records with vector search (or regex fallback), and uses an LLM to answer questions grounded in those transactions.

## Current Scope
- User registration + JWT login/logout
- Transaction retrieval with embeddings + MongoDB vector search
- RAG answers with provider fallback (Groq or Hugging Face)
- Optional scripts to generate CSVs and embeddings

## Future Scope 
- Add first-class CSV ingestion API endpoint
- Improve analytics endpoints (monthly summaries, category trends, cash-flow)
- Add budget rules, alerts, and anomaly detection
- Expand vector search to include balances and category tags
- Add a production-ready deployment guide (Docker + Atlas + CI)

## What This Project Includes
- JWT-authenticated API with user registration/login
- Transaction retrieval with vector search fallback to regex matching
- RAG-style question answering backed by Groq or Hugging Face
- Optional scripts for generating sample data and embeddings

## Project Structure
- `backend/`: Django API + MongoDB integration
- `data/`: sample CSV files
- `scripts/`: helper scripts for generating CSV and embeddings
- `frontend/`: simple React app (see `frontend/README.md`)

## 1. Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Copy env template:
```bash
copy .env.example .env
```

Minimum required env values:
- `MONGO_URI`
- `DB_NAME`

Optional but recommended:
- `EMBEDDING_MODEL` for vector search embeddings
- `GROQ_API_KEY` or `HF_API_KEY` for `/ask/` responses
- `VECTOR_INDEX_NAME` if you created a custom MongoDB vector index name

## 2. Run Backend
```bash
python manage.py runserver
```

Base URL:
- `http://127.0.0.1:8000/api/v1/`

## 3. Load Sample Data (Optional)
Generate a CSV:
```bash
python scripts/generate_transactions.py
```

Ingest it from the Django shell:
```bash
cd backend
python manage.py shell
```

```python
from transactions.services import ingest_csv
ingest_csv("../data/sample_transactions.csv", return_report=True)
```

If you already have transactions but no embeddings, generate them:
```bash
python scripts/generate_embeddings.py
```

Force-regenerate embeddings for all records:
```bash
python scripts/generate_embeddings.py --force
```

## 4. API Endpoints
Health check:
- `GET /api/v1/status/`

Auth:
- `POST /api/v1/auth/register/` -> create user
- `POST /api/v1/auth/login/` -> returns JWT `access` and `refresh`
- `POST /api/v1/auth/logout/` -> client-side token discard

Protected endpoints require:
- `Authorization: Bearer <access-token>`

Retrieve transactions (vector search first, regex fallback):
- `POST /api/v1/retrieve/`
- `GET /api/v1/retrieve/?question=...&k=8`

Ask a question with RAG:
- `POST /api/v1/ask/`
- `GET /api/v1/ask/?question=...&k=8`

Example request body:
```json
{ "question": "recent grocery spends", "k": 8 }
```

Notes:
- `score` appears only when vector search is available.
- `/ask/` uses `LLM_FALLBACK_ORDER` and returns `provider` + `provider_errors`.

## 5. Tests
```bash
python manage.py test transactions -v 2
```
