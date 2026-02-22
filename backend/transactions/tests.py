import csv
import os
import tempfile
from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase
from pymongo.errors import DuplicateKeyError

from . import services


class _FakeCollection:
    def __init__(self):
        self.docs = []
        self._ids = set()

    def insert_one(self, doc):
        transaction_id = doc.get("transaction_id")
        if transaction_id in self._ids:
            raise DuplicateKeyError("duplicate transaction_id")
        self._ids.add(transaction_id)
        self.docs.append(doc)
        return {"inserted_id": transaction_id}

    def create_index(self, *args, **kwargs):
        return None


class _FakeDB:
    def __init__(self):
        self._collections = {}

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = _FakeCollection()
        return self._collections[name]


class IngestionServiceTests(SimpleTestCase):
    def _write_csv(self, rows):
        headers = [
            "date",
            "receiver",
            "description",
            "amount",
            "transaction_type",
            "balance",
            "transaction_id",
        ]
        temp = tempfile.NamedTemporaryFile(mode="w", newline="", delete=False, encoding="utf-8")
        try:
            writer = csv.DictWriter(temp, fieldnames=headers)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            return temp.name
        finally:
            temp.close()

    def test_ingestion_handles_missing_date_duplicate_and_tagging(self):
        rows = [
            {
                "date": "2026-02-01",
                "receiver": "Company Pvt Ltd",
                "description": "Salary Credit",
                "amount": "1000",
                "transaction_type": "credit",
                "balance": "5000",
                "transaction_id": "tx-001",
            },
            {
                "date": "2026-02-01",
                "receiver": "Company Pvt Ltd",
                "description": "Salary Credit",
                "amount": "1000",
                "transaction_type": "credit",
                "balance": "6000",
                "transaction_id": "tx-001",
            },
            {
                "date": "",
                "receiver": "Landlord",
                "description": "House Rent",
                "amount": "2000",
                "transaction_type": "debit",
                "balance": "4000",
                "transaction_id": "tx-003",
            },
            {
                "date": "2026-02-03",
                "receiver": "Landlord",
                "description": "House Rent",
                "amount": "2000",
                "transaction_type": "debit",
                "balance": "3000",
                "transaction_id": "tx-004",
            },
            {
                "date": "2026-02-04",
                "receiver": "Zomato",
                "description": "Online Payment",
                "amount": "300",
                "transaction_type": "debit",
                "balance": "2700",
                "transaction_id": "tx-005",
            },
        ]
        csv_path = self._write_csv(rows)
        fake_db = _FakeDB()

        try:
            with patch("transactions.services.get_db", return_value=fake_db):
                report = services.ingest_csv(csv_path, return_report=True)
        finally:
            os.unlink(csv_path)

        self.assertEqual(report["inserted_count"], 3)
        self.assertEqual(report["duplicate_count"], 1)
        self.assertEqual(report["invalid_count"], 1)
        self.assertEqual(len(report["invalid_rows"]), 1)

        docs = fake_db[settings.MONGO_TRANSACTIONS_COLLECTION].docs
        categories = {doc["transaction_id"]: doc["category"] for doc in docs}
        self.assertEqual(categories["tx-001"], "Income")
        self.assertEqual(categories["tx-004"], "Fixed_Expense")
        self.assertEqual(categories["tx-005"], "Discretionary")

    def test_ingestion_generates_transaction_id_when_missing(self):
        rows = [
            {
                "date": "2026-02-05",
                "receiver": "Rahul",
                "description": "UPI Transfer",
                "amount": "500",
                "transaction_type": "credit",
                "balance": "3200",
                "transaction_id": "",
            }
        ]
        csv_path = self._write_csv(rows)
        fake_db = _FakeDB()

        try:
            with patch("transactions.services.get_db", return_value=fake_db):
                report = services.ingest_csv(csv_path, return_report=True)
        finally:
            os.unlink(csv_path)

        self.assertEqual(report["inserted_count"], 1)
        docs = fake_db[settings.MONGO_TRANSACTIONS_COLLECTION].docs
        self.assertEqual(len(docs[0]["transaction_id"]), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in docs[0]["transaction_id"]))
