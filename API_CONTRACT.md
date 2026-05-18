# FinAgent API Contract (Sprint 4 Frontend Freeze)

## Base
- BASE URL: `http://127.0.0.1:8000/api`
- POST content type: `application/json`
- Standard error shape:

```json
{ "error": "<message>" }
```

## 1) Health
- Method: `GET`
- Path: `/status/`

Response `200`:

```json
{ "status": "ok" }
```

## 2) Ingest Sample CSV
- Method: `GET`
- Path: `/ingest/`

Response `200`:

```json
{
  "message": "N records inserted successfully",
  "report": {
    "inserted_count": 0,
    "duplicate_count": 0,
    "invalid_count": 0,
    "invalid_rows": []
  }
}
```

Typical errors:
- `404`: sample CSV missing
- `500`: Mongo/processing error

## 3) Summary
- Method: `GET`
- Path: `/summary/`

Response `200`:

```json
{
  "summary_by_type": [
    { "_id": "credit", "total": 12345.0 },
    { "_id": "debit", "total": 6789.0 }
  ],
  "summary_by_category": [
    { "_id": "Income", "total": 10000.0 },
    { "_id": "Fixed_Expense", "total": 3000.0 },
    { "_id": "Discretionary", "total": 2000.0 }
  ]
}
```

## 4) Retrieve (Top-K Vector Matches)
- Method: `POST`
- Path: `/retrieve/`

Request:

```json
{ "question": "grocery", "k": 8 }
```

Response `200`:

```json
{
  "question": "grocery",
  "top_k": 8,
  "count": 8,
  "results": [
    {
      "transaction_id": "string",
      "date": "YYYY-MM-DD",
      "receiver": "string",
      "description": "string",
      "amount": 123.0,
      "transaction_type": "credit|debit",
      "category": "Income|Fixed_Expense|Discretionary",
      "score": 0.57
    }
  ]
}
```

Validation error `400`:

```json
{ "error": "k must be greater than 0" }
```

## 5) Ask (RAG Answer)
- Method: `POST`
- Path: `/ask/`

Request:

```json
{ "question": "Can I afford a 2000 purchase this month?", "k": 8 }
```

Response `200`:

```json
{
  "question": "Can I afford a 2000 purchase this month?",
  "top_k": 8,
  "answer": "string",
  "provider_used": "groq|huggingface|none",
  "model_used": "string",
  "provider_errors": [],
  "sources": [
    {
      "transaction_id": "string",
      "date": "YYYY-MM-DD",
      "receiver": "string",
      "description": "string",
      "amount": 123.0,
      "transaction_type": "credit|debit",
      "category": "Income|Fixed_Expense|Discretionary",
      "score": 0.57
    }
  ],
  "source_count": 8
}
```

Validation error `400`:

```json
{ "error": "question is required" }
```

Provider failure `500`:

```json
{ "error": "All LLM providers failed: [...]" }
```

## Frontend Handling Rules
1. Treat non-2xx as error toast/message using the `error` key.
2. For `/ask/`, always render `answer` plus collapsible `sources`.
3. Show `provider_used` + `model_used` as a small debug badge.
4. Never assume arrays are non-empty.
5. Parse numeric totals/amounts as numbers for charts.
