"""
Transaction ingestion service.

Changes from v1:
  - Uses hybrid categorizer (merchant map + regex) instead of simple regex
  - Stores normalized_merchant on each document
  - Stores user_id if provided
  - Upserts vector into Qdrant after MongoDB insert
"""

import csv
import hashlib
from datetime import date
from typing import Literal

from django.conf import settings
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from pymongo.errors import DuplicateKeyError

from .utils import get_db
from .categorizer import categorize_transaction
from .merchant_normalizer import normalize_merchant
from embeddings.embedding_service import generate_embedding


class TransactionRowSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    date: date
    receiver: str = Field(min_length=1)
    description: str = Field(min_length=1)
    amount: float
    transaction_type: Literal["debit", "credit"]
    balance: float
    transaction_id: str | None = None

    @field_validator("date", mode="before")
    @classmethod
    def validate_date_present(cls, value):
        if value is None:
            raise ValueError("date is required")
        if isinstance(value, str) and not value.strip():
            raise ValueError("date is required")
        return value

    @field_validator("transaction_type", mode="before")
    @classmethod
    def normalize_transaction_type(cls, value):
        if value is None:
            raise ValueError("transaction_type is required")
        return str(value).strip().lower()


def generate_transaction_id(row: TransactionRowSchema) -> str:
    unique_string = "|".join(
        [
            row.date.isoformat(),
            row.receiver.lower(),
            row.description.lower(),
            f"{row.amount:.2f}",
            row.transaction_type,
        ]
    )
    return hashlib.sha256(unique_string.encode("utf-8")).hexdigest()


def _resolve_transaction_id(row: TransactionRowSchema) -> str:
    if row.transaction_id and row.transaction_id.strip():
        return row.transaction_id.strip()
    return generate_transaction_id(row)


def ingest_csv(file_path: str, return_report: bool = False, user_id: str | None = None):
    """
    Ingest a CSV file of transactions into MongoDB and Qdrant.

    Args:
        file_path: Path to the CSV file.
        return_report: If True, return a detailed ingestion report dict.
        user_id: Optional user ID to associate transactions with a specific user.
    """
    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    report = {
        "inserted_count": 0,
        "duplicate_count": 0,
        "invalid_count": 0,
        "invalid_rows": [],
    }

    with open(file_path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row_number, raw_row in enumerate(reader, start=2):
            try:
                row = TransactionRowSchema.model_validate(raw_row)
            except ValidationError as exc:
                report["invalid_count"] += 1
                report["invalid_rows"].append(
                    {
                        "row_number": row_number,
                        "error": exc.errors()[0]["msg"],
                    }
                )
                continue

            transaction_id = _resolve_transaction_id(row)
            normalized = normalize_merchant(row.receiver)
            category = categorize_transaction(row.receiver, row.description, row.transaction_type)

            transaction = {
                "transaction_id": transaction_id,
                "date": row.date.isoformat(),
                "receiver": row.receiver,
                "normalized_merchant": normalized,
                "description": row.description,
                "amount": row.amount,
                "transaction_type": row.transaction_type,
                "balance": row.balance,
                "category": category,
            }

            if user_id:
                transaction["user_id"] = user_id

            # Generate embedding
            embedding = None
            try:
                embedding = generate_embedding(f"{row.receiver} {row.description}")
                transaction["embedding"] = embedding
            except Exception:
                transaction["embedding"] = None

            # Insert into MongoDB
            try:
                collection.insert_one(transaction)
                report["inserted_count"] += 1
            except DuplicateKeyError:
                report["duplicate_count"] += 1
                continue

            # Upsert into Qdrant (non-blocking — failure doesn't stop ingestion)
            if embedding:
                try:
                    from .qdrant_service import upsert_vector
                    upsert_vector(
                        transaction_id=transaction_id,
                        vector=embedding,
                        user_id=user_id,
                        category=category,
                        normalized_merchant=normalized,
                        transaction_type=row.transaction_type,
                        transaction_date=row.date.isoformat(),
                    )
                except Exception:
                    pass  # Qdrant failure doesn't block ingestion

    if return_report:
        return report
    return report["inserted_count"]
