import csv
import json
import os
import tempfile
from unittest.mock import patch

from django.conf import settings
from django.test import Client, SimpleTestCase
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


class RagEndpointTests(SimpleTestCase):
    def setUp(self):
        self.client = Client()

    @patch("transactions.views.retrieve_transactions_for_query")
    def test_retrieve_endpoint_returns_results(self, mock_retrieve):
        mock_retrieve.return_value = [
            {
                "transaction_id": "tx-1",
                "receiver": "Swiggy",
                "description": "Online Payment",
                "score": 0.61,
            }
        ]

        response = self.client.post(
            "/api/retrieve/",
            data=json.dumps({"question": "food", "k": 3}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["transaction_id"], "tx-1")
        mock_retrieve.assert_called_once_with(question="food", top_k=3)

    @patch("transactions.views.answer_question_with_context")
    @patch("transactions.views.retrieve_transactions_for_query")
    def test_ask_endpoint_returns_answer_and_sources(self, mock_retrieve, mock_answer):
        mock_retrieve.return_value = [
            {
                "transaction_id": "tx-2",
                "receiver": "Landlord",
                "description": "House Rent",
                "score": 0.88,
            }
        ]
        mock_answer.return_value = {
            "answer": "Based on your recent expenses, this looks tight.",
            "provider_used": "groq",
            "model_used": "llama-3.1-8b-instant",
            "fallback_count": 0,
            "provider_errors": [],
        }

        response = self.client.post(
            "/api/ask/",
            data=json.dumps({"question": "Can I buy a phone?", "k": 2}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("answer", payload)
        self.assertEqual(payload["provider_used"], "groq")
        self.assertEqual(payload["source_count"], 1)
        self.assertEqual(payload["sources"][0]["transaction_id"], "tx-2")
        mock_retrieve.assert_called_once_with(question="Can I buy a phone?", top_k=2)
        mock_answer.assert_called_once()

    def test_ask_endpoint_requires_question(self):
        response = self.client.post(
            "/api/ask/",
            data=json.dumps({"question": "", "k": 2}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())
