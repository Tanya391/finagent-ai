"""
Deterministic Analytics Engine.

The LLM never performs calculations. This module handles all math:
  - total spending
  - monthly summaries
  - category breakdown
  - top merchants
  - cashflow (income vs expense)
  - subscription detection
  - anomaly detection (z-score based)
  - period comparison
  - category trend analysis

All functions accept an optional user_id to scope queries per user.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import date, datetime
from typing import Any

from django.conf import settings

from .utils import get_db


def _collection():
    db = get_db()
    return db[settings.MONGO_TRANSACTIONS_COLLECTION]


def _base_filter(
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    transaction_type: str | None = None,
    category: str | None = None,
) -> dict:
    f: dict = {}
    # Match docs belonging to this user OR docs with no user_id (demo/shell-ingested data)
    if user_id:
        f["$or"] = [
            {"user_id": user_id},
            {"user_id": {"$exists": False}},
        ]
    if transaction_type:
        f["transaction_type"] = transaction_type
    if category:
        f["category"] = {"$regex": category, "$options": "i"}
    if date_from or date_to:
        date_filter: dict = {}
        if date_from:
            date_filter["$gte"] = date_from.isoformat()
        if date_to:
            date_filter["$lte"] = date_to.isoformat()
        f["date"] = date_filter
    return f


# ---------------------------------------------------------------------------
# Total spending
# ---------------------------------------------------------------------------
def get_total_spending(
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    category: str | None = None,
    transaction_type: str = "debit",
) -> dict[str, Any]:
    col = _collection()
    f = _base_filter(user_id, date_from, date_to, transaction_type, category)

    pipeline = [
        {"$match": f},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    result = list(col.aggregate(pipeline))
    if result:
        return {"total": round(result[0]["total"], 2), "count": result[0]["count"]}
    return {"total": 0.0, "count": 0}


# ---------------------------------------------------------------------------
# Monthly summary
# ---------------------------------------------------------------------------
def get_monthly_summary(
    user_id: str | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    col = _collection()
    f: dict = {}
    if user_id:
        f["$or"] = [{"user_id": user_id}, {"user_id": {"$exists": False}}]
    if year:
        f["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}

    pipeline = [
        {"$match": f},
        {
            "$group": {
                "_id": {
                    "year": {"$substr": ["$date", 0, 4]},
                    "month": {"$substr": ["$date", 5, 2]},
                    "type": "$transaction_type",
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]

    raw = list(col.aggregate(pipeline))

    # Reshape into {year_month: {income, expense, net}}
    summary: dict[str, dict] = defaultdict(lambda: {"income": 0.0, "expense": 0.0, "count": 0})
    for row in raw:
        ym = f"{row['_id']['year']}-{row['_id']['month']}"
        t = row["_id"]["type"]
        if t == "credit":
            summary[ym]["income"] += row["total"]
        else:
            summary[ym]["expense"] += row["total"]
        summary[ym]["count"] += row["count"]

    result = []
    for ym, data in sorted(summary.items()):
        result.append({
            "month": ym,
            "income": round(data["income"], 2),
            "expense": round(data["expense"], 2),
            "net": round(data["income"] - data["expense"], 2),
            "count": data["count"],
        })
    return result


# ---------------------------------------------------------------------------
# Category breakdown
# ---------------------------------------------------------------------------
def get_category_breakdown(
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    transaction_type: str = "debit",
) -> list[dict[str, Any]]:
    col = _collection()
    f = _base_filter(user_id, date_from, date_to, transaction_type)

    pipeline = [
        {"$match": f},
        {
            "$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"total": -1}},
    ]

    return [
        {"category": row["_id"] or "other", "total": round(row["total"], 2), "count": row["count"]}
        for row in col.aggregate(pipeline)
    ]


# ---------------------------------------------------------------------------
# Top merchants
# ---------------------------------------------------------------------------
def get_top_merchants(
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 10,
    transaction_type: str = "debit",
) -> list[dict[str, Any]]:
    col = _collection()
    f = _base_filter(user_id, date_from, date_to, transaction_type)

    pipeline = [
        {"$match": f},
        {
            "$group": {
                "_id": "$normalized_merchant",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"total": -1}},
        {"$limit": limit},
    ]

    return [
        {
            "merchant": row["_id"] or "unknown",
            "total": round(row["total"], 2),
            "count": row["count"],
        }
        for row in col.aggregate(pipeline)
    ]


# ---------------------------------------------------------------------------
# Cashflow
# ---------------------------------------------------------------------------
def get_cashflow(
    user_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    col = _collection()
    f = _base_filter(user_id, date_from, date_to)

    pipeline = [
        {"$match": f},
        {
            "$group": {
                "_id": "$transaction_type",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
    ]

    income = 0.0
    expense = 0.0
    income_count = 0
    expense_count = 0

    for row in col.aggregate(pipeline):
        if row["_id"] == "credit":
            income = round(row["total"], 2)
            income_count = row["count"]
        else:
            expense = round(row["total"], 2)
            expense_count = row["count"]

    return {
        "income": income,
        "expense": expense,
        "net": round(income - expense, 2),
        "income_count": income_count,
        "expense_count": expense_count,
    }


# ---------------------------------------------------------------------------
# Subscription detection
# ---------------------------------------------------------------------------
def detect_subscriptions(
    user_id: str | None = None,
    min_occurrences: int = 2,
) -> list[dict[str, Any]]:
    """
    Detect recurring charges by finding merchants that appear multiple times
    with similar amounts at roughly monthly intervals.
    """
    col = _collection()
    f: dict = {"transaction_type": "debit"}
    if user_id:
        f["$or"] = [{"user_id": user_id}, {"user_id": {"$exists": False}}]

    pipeline = [
        {"$match": f},
        {
            "$group": {
                "_id": "$normalized_merchant",
                "occurrences": {"$sum": 1},
                "amounts": {"$push": "$amount"},
                "dates": {"$push": "$date"},
                "total": {"$sum": "$amount"},
            }
        },
        {"$match": {"occurrences": {"$gte": min_occurrences}}},
        {"$sort": {"occurrences": -1}},
    ]

    subscriptions = []
    for row in col.aggregate(pipeline):
        amounts = row["amounts"]
        # Check if amounts are similar (std dev < 20% of mean)
        if len(amounts) >= 2:
            mean_amount = statistics.mean(amounts)
            try:
                std_dev = statistics.stdev(amounts)
            except statistics.StatisticsError:
                std_dev = 0
            if mean_amount > 0 and (std_dev / mean_amount) < 0.2:
                subscriptions.append({
                    "merchant": row["_id"] or "unknown",
                    "occurrences": row["occurrences"],
                    "avg_amount": round(mean_amount, 2),
                    "total_charged": round(row["total"], 2),
                    "last_date": max(row["dates"]) if row["dates"] else None,
                })

    return subscriptions


# ---------------------------------------------------------------------------
# Anomaly detection (z-score based)
# ---------------------------------------------------------------------------
def detect_unusual_spending(
    user_id: str | None = None,
    z_threshold: float = 2.0,
) -> list[dict[str, Any]]:
    """
    Detect transactions with unusually high amounts using z-score.
    A transaction is flagged if its amount is more than z_threshold
    standard deviations above the mean for its category.
    """
    col = _collection()
    f: dict = {"transaction_type": "debit"}
    if user_id:
        f["$or"] = [{"user_id": user_id}, {"user_id": {"$exists": False}}]

    # Get all debit transactions
    transactions = list(col.find(f, {"_id": 0, "transaction_id": 1, "amount": 1,
                                     "category": 1, "receiver": 1, "date": 1,
                                     "normalized_merchant": 1}))

    if not transactions:
        return []

    # Group amounts by category
    category_amounts: dict[str, list[float]] = defaultdict(list)
    for tx in transactions:
        category_amounts[tx.get("category", "other")].append(tx["amount"])

    # Compute stats per category
    category_stats: dict[str, dict] = {}
    for cat, amounts in category_amounts.items():
        if len(amounts) >= 3:
            mean = statistics.mean(amounts)
            try:
                std = statistics.stdev(amounts)
            except statistics.StatisticsError:
                std = 0
            category_stats[cat] = {"mean": mean, "std": std}

    anomalies = []
    for tx in transactions:
        cat = tx.get("category", "other")
        stats = category_stats.get(cat)
        if not stats or stats["std"] == 0:
            continue
        z_score = (tx["amount"] - stats["mean"]) / stats["std"]
        if z_score > z_threshold:
            anomalies.append({
                "transaction_id": tx["transaction_id"],
                "date": tx["date"],
                "receiver": tx.get("receiver"),
                "normalized_merchant": tx.get("normalized_merchant"),
                "category": cat,
                "amount": tx["amount"],
                "z_score": round(z_score, 2),
                "category_mean": round(stats["mean"], 2),
            })

    return sorted(anomalies, key=lambda x: x["z_score"], reverse=True)


# ---------------------------------------------------------------------------
# Compare two periods
# ---------------------------------------------------------------------------
def compare_months(
    user_id: str | None = None,
    period_a_from: date | None = None,
    period_a_to: date | None = None,
    period_b_from: date | None = None,
    period_b_to: date | None = None,
) -> dict[str, Any]:
    a = get_total_spending(user_id, period_a_from, period_a_to)
    b = get_total_spending(user_id, period_b_from, period_b_to)

    a_total = a["total"]
    b_total = b["total"]
    change = round(b_total - a_total, 2)
    pct_change = round((change / a_total * 100), 1) if a_total else None

    return {
        "period_a": {"from": period_a_from, "to": period_a_to, "total": a_total, "count": a["count"]},
        "period_b": {"from": period_b_from, "to": period_b_to, "total": b_total, "count": b["count"]},
        "change": change,
        "pct_change": pct_change,
        "direction": "increase" if change > 0 else "decrease" if change < 0 else "no_change",
    }


# ---------------------------------------------------------------------------
# Category trend analysis
# ---------------------------------------------------------------------------
def category_trend_analysis(
    category: str,
    user_id: str | None = None,
    months: int = 6,
) -> list[dict[str, Any]]:
    """Returns monthly spending totals for a specific category over the last N months."""
    from calendar import monthrange
    from datetime import date

    today = date.today()
    results = []

    for i in range(months - 1, -1, -1):
        # Go back i months from current month
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        last_day = monthrange(year, month)[1]
        d_from = date(year, month, 1)
        d_to = date(year, month, last_day)

        data = get_total_spending(user_id, d_from, d_to, category)
        results.append({
            "month": f"{year}-{month:02d}",
            "total": data["total"],
            "count": data["count"],
        })

    return results
