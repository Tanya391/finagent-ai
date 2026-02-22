import csv
import hashlib
import re
from datetime import date
from typing import Literal

from django.conf import settings
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from pymongo.errors import DuplicateKeyError

from .utils import get_db


INCOME_PATTERNS = [
    re.compile(r"\bsalary\b", re.IGNORECASE),
    re.compile(r"\bbonus\b", re.IGNORECASE),
    re.compile(r"\brefund\b", re.IGNORECASE),
    re.compile(r"\binterest\b", re.IGNORECASE),
    re.compile(r"\bdividend\b", re.IGNORECASE),
]

FIXED_EXPENSE_PATTERNS = [
    re.compile(r"\brent\b", re.IGNORECASE),
    re.compile(r"\belectricity\b", re.IGNORECASE),
    re.compile(r"\bwater\b", re.IGNORECASE),
    re.compile(r"\bgas\b", re.IGNORECASE),
    re.compile(r"\binternet\b", re.IGNORECASE),
    re.compile(r"\bmobile recharge\b", re.IGNORECASE),
    re.compile(r"\bemi\b", re.IGNORECASE),
    re.compile(r"\binsurance\b", re.IGNORECASE),
]


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


def classify_transaction(row: TransactionRowSchema) -> str:
    combined_text = f"{row.receiver} {row.description}"
    if row.transaction_type == "credit" or any(p.search(combined_text) for p in INCOME_PATTERNS):
        return "Income"
    if any(p.search(combined_text) for p in FIXED_EXPENSE_PATTERNS):
        return "Fixed_Expense"
    return "Discretionary"


def _resolve_transaction_id(row: TransactionRowSchema) -> str:
    if row.transaction_id and row.transaction_id.strip():
        return row.transaction_id.strip()
    return generate_transaction_id(row)


def ingest_csv(file_path: str, return_report: bool = False):
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
            transaction = {
                "transaction_id": transaction_id,
                "date": row.date.isoformat(),
                "receiver": row.receiver,
                "description": row.description,
                "amount": row.amount,
                "transaction_type": row.transaction_type,
                "balance": row.balance,
                "category": classify_transaction(row),
            }

            try:
                collection.insert_one(transaction)
                report["inserted_count"] += 1
            except DuplicateKeyError:
                report["duplicate_count"] += 1

    if return_report:
        return report
    return report["inserted_count"]
