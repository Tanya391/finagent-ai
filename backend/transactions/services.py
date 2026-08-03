"""
Transaction ingestion service.

Changes from v1:
  - Uses hybrid categorizer (merchant map + regex) instead of simple regex
  - Stores normalized_merchant on each document
  - Stores user_id if provided
"""

import csv
import hashlib
import random
import uuid
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from typing import Literal

from django.conf import settings
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from pymongo.errors import DuplicateKeyError

from .utils import get_db
from .categorizer import categorize_transaction
from .merchant_normalizer import normalize_merchant


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
    Ingest a CSV file of transactions into MongoDB.

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

            # Insert into MongoDB
            try:
                collection.insert_one(transaction)
                report["inserted_count"] += 1
            except DuplicateKeyError:
                report["duplicate_count"] += 1
                continue

    if return_report:
        return report
    return report["inserted_count"]

def _create_tx(user_id, date_obj, amount, tx_type, desc, merchant, category):
    return {
        "transaction_id": str(uuid.uuid4()),
        "user_id": str(user_id),
        "date": date_obj.strftime("%Y-%m-%d"),
        "amount": amount,
        "transaction_type": tx_type,
        "description": desc,
        "receiver": merchant,
        "normalized_merchant": merchant,
        "category": category,
        "created_at": datetime.utcnow()
    }

def generate_demo_data(user_id: str, months: int = 6) -> int:
    """Generates realistic transaction data for a user and saves to DB. Returns count."""
    db = get_db()
    col = db[settings.MONGO_TRANSACTIONS_COLLECTION]
    
    end_date = datetime.now()
    start_date = end_date - relativedelta(months=months)

    transactions = []

    merchants = {
        "Groceries": ["DMart", "BigBasket", "Reliance Fresh", "Nature's Basket"],
        "Dining": ["Zomato", "Swiggy", "Starbucks", "Dominos", "Local Cafe"],
        "Shopping": ["Amazon", "Flipkart", "Myntra", "Zara", "H&M"],
        "Utilities": ["Electricity Board", "Jio", "Airtel", "Water Bill"],
        "Entertainment": ["Netflix", "Spotify", "PVR Cinemas", "BookMyShow"],
        "Transport": ["Uber", "Ola", "Indian Railways", "Metro"],
        "Health": ["Apollo Pharmacy", "Practo", "Local Clinic"],
    }

    current_date = start_date
    while current_date <= end_date:
        salary_date = datetime(current_date.year, current_date.month, 1)
        if start_date <= salary_date <= end_date:
            transactions.append(_create_tx(user_id, salary_date, 85000.0, "credit", "Monthly Salary", "TechCorp Inc.", "Income"))
        
        rent_date = datetime(current_date.year, current_date.month, 5)
        if start_date <= rent_date <= end_date:
            transactions.append(_create_tx(user_id, rent_date, 22000.0, "debit", "Monthly Rent", "Landlord", "Housing"))
        
        num_tx = random.randint(20, 40)
        for _ in range(num_tx):
            random_day = random.randint(1, 28)
            tx_date = datetime(current_date.year, current_date.month, random_day)
            if not (start_date <= tx_date <= end_date):
                continue
            
            cat = random.choice(list(merchants.keys()))
            merchant = random.choice(merchants[cat])
            
            if cat == "Groceries":
                amt = random.uniform(500, 3000)
            elif cat == "Dining":
                amt = random.uniform(200, 1500)
            elif cat == "Shopping":
                amt = random.uniform(1000, 5000)
            elif cat == "Utilities":
                amt = random.uniform(800, 2500)
            elif cat == "Entertainment":
                amt = random.uniform(199, 999)
            elif cat == "Transport":
                amt = random.uniform(100, 800)
            else:
                amt = random.uniform(200, 2000)
            
            transactions.append(_create_tx(user_id, tx_date, round(amt, 2), "debit", f"{cat} Payment", merchant, cat))

        current_date += relativedelta(months=1)
        current_date = datetime(current_date.year, current_date.month, 1)

    if transactions:
        col.insert_many(transactions)
    
    return len(transactions)
