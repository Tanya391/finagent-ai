# FinAgent AI

Sprint-based personal finance assistant project.

## Structure
- `backend/`: Django + Mongo integration
- `frontend/`: React app scaffold
- `data/`: static CSV transaction data
- `scripts/`: helper scripts

## First commit checklist
1. Copy `backend/.env.example` to `backend/.env` and set values.
2. Do not commit any real `.env` files.
3. Add your static CSV in `data/`.

## Quick start (backend)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Sprint 1 verification
Run these checks before committing Sprint 1:

```bash
cd backend
python manage.py test transactions
python manage.py runserver
```

Then call:

`GET /api/ingest/`

Expected response includes:
- `report.inserted_count`
- `report.duplicate_count`
- `report.invalid_count`
- `report.invalid_rows`

## Git
```bash
git add .
git commit -m "Initial scaffold"
```
