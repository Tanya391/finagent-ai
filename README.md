# FinAgent AI (Backend-First)

Beginner-friendly personal finance backend using Django + MongoDB.

## What This Project Includes
- CSV ingestion API for bank-like transactions
- Summary API by transaction type and category
- Optional embedding generation scripts

## Project Structure
- `backend/`: Django API + MongoDB integration
- `data/`: sample CSV files
- `scripts/`: helper scripts for generating CSV and embeddings
- `frontend/`: intentionally removed placeholder app (see `frontend/README.md`)

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

## 2. Run Backend
```bash
python manage.py runserver
```

## 3. API Endpoints
- `GET /api/health/` -> basic health check
- `GET /api/ingest/` -> ingests `data/sample_transactions.csv`
- `GET /api/summary/` -> returns spend/income summary

## 4. Tests
```bash
python manage.py test transactions -v 2
```

## 5. Helper Scripts (from project root)
Generate sample CSV:
```bash
python scripts/generate_transactions.py
```

Generate embeddings for documents that do not have embeddings:
```bash
python scripts/generate_embeddings.py
```

Force-regenerate embeddings for all records:
```bash
python scripts/generate_embeddings.py --force
```
