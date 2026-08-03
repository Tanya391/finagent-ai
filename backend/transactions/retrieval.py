"""
Hybrid Retrieval Engine.

priority:
  1. MongoDB metadata filter (category / merchant / date / type)
  2. Regex text search fallback
  3. Broad fallback — return recent transactions when nothing else matches

user_id handling:
  Documents ingested via shell have no user_id field.
  All queries match docs that EITHER belong to the current user OR have no user_id.
  This ensures demo/seed data is always visible.
"""

from __future__ import annotations

import logging
from datetime import date

from django.conf import settings

from .utils import get_db
from .query_parser import ParsedQuery

logger = logging.getLogger(__name__)

_PROJECTION = {
    "_id": 0,
    "transaction_id": 1,
    "date": 1,
    "receiver": 1,
    "normalized_merchant": 1,
    "description": 1,
    "amount": 1,
    "transaction_type": 1,
    "category": 1,
    "balance": 1,
}


def _user_clause(user_id: str | None) -> dict:
    """
    Returns a MongoDB filter clause that matches:
      - documents belonging to this user, OR
      - documents with no user_id (shell-ingested / demo data)
    When user_id is None, returns {} (match everything).
    """
    if not user_id:
        return {}
    return {
        "$or": [
            {"user_id": user_id},
            {"user_id": {"$exists": False}},
        ]
    }


def _fetch_by_ids(collection, transaction_ids: list[str]) -> dict[str, dict]:
    docs = collection.find({"transaction_id": {"$in": transaction_ids}}, _PROJECTION)
    return {doc["transaction_id"]: doc for doc in docs}


def _metadata_search(collection, parsed: ParsedQuery, user_id: str | None, limit: int) -> list[dict]:
    """
    MongoDB filter search using structured fields from the parsed query.
    Always includes the user clause so demo data is visible.
    Returns empty list only when parsed has no useful filters at all.
    """
    has_filters = any([
        parsed.category,
        parsed.merchant,
        parsed.transaction_type,
        parsed.date_from,
        parsed.date_to,
    ])
    if not has_filters:
        return []

    mongo_filter: dict = {}
    uc = _user_clause(user_id)
    if uc:
        mongo_filter.update(uc)

    if parsed.category:
        mongo_filter["category"] = {"$regex": parsed.category, "$options": "i"}
    if parsed.merchant:
        mongo_filter["normalized_merchant"] = {"$regex": parsed.merchant, "$options": "i"}
    if parsed.transaction_type:
        mongo_filter["transaction_type"] = parsed.transaction_type
    if parsed.date_from or parsed.date_to:
        date_filter: dict = {}
        if parsed.date_from:
            date_filter["$gte"] = parsed.date_from.isoformat()
        if parsed.date_to:
            date_filter["$lte"] = parsed.date_to.isoformat()
        mongo_filter["date"] = date_filter

    results = list(
        collection.find(mongo_filter, _PROJECTION).sort("date", -1).limit(limit)
    )
    for r in results:
        r["metadata_score"] = 1.0
    return results


def _regex_search(collection, question: str, user_id: str | None, limit: int) -> list[dict]:
    """Text search across receiver, description, category, normalized_merchant."""
    clean = (question or "").strip()
    if not clean:
        return []

    uc = _user_clause(user_id)
    text_filter = {
        "$or": [
            {"receiver":            {"$regex": clean, "$options": "i"}},
            {"description":         {"$regex": clean, "$options": "i"}},
            {"category":            {"$regex": clean, "$options": "i"}},
            {"normalized_merchant": {"$regex": clean, "$options": "i"}},
        ]
    }

    if uc:
        mongo_filter = {"$and": [uc, text_filter]}
    else:
        mongo_filter = text_filter

    results = list(
        collection.find(mongo_filter, _PROJECTION).sort("date", -1).limit(limit)
    )
    for r in results:
        r["regex_score"] = 1.0
    return results


def _broad_search(collection, user_id: str | None, limit: int) -> list[dict]:
    """
    Last-resort fallback — return the most recent transactions.
    Used when all other strategies return nothing (e.g. 'show all transactions').
    """
    mongo_filter = _user_clause(user_id)
    results = list(
        collection.find(mongo_filter, _PROJECTION).sort("date", -1).limit(limit)
    )
    for r in results:
        r["regex_score"] = 0.05   # low score — broad match
    return results


def _merge_results(
    metadata_hits: list[dict],
    regex_hits: list[dict],
    limit: int,
) -> list[dict]:
    """
    Weighted merge and deduplication.
    final_score = 0.8 * metadata + 0.2 * regex
    """
    scores: dict[str, dict] = {}

    for hit in metadata_hits:
        tid = hit.get("transaction_id")
        if not tid:
            continue
        if tid in scores:
            scores[tid]["final_score"] = round(scores[tid]["final_score"] + 0.8, 4)
        else:
            scores[tid] = {**hit, "final_score": 0.8}

    for hit in regex_hits:
        tid = hit.get("transaction_id")
        if not tid:
            continue
        bonus = hit.get("regex_score", 0.1) * 0.2
        if tid in scores:
            scores[tid]["final_score"] = round(scores[tid]["final_score"] + bonus, 4)
        else:
            scores[tid] = {**hit, "final_score": round(bonus, 4)}

    merged = sorted(scores.values(), key=lambda x: x.get("final_score", 0), reverse=True)

    for item in merged:
        item.pop("metadata_score", None)
        item.pop("regex_score", None)

    return merged[:limit]


def retrieve_transactions_for_query(
    question: str,
    top_k: int | None = None,
    parsed: ParsedQuery | None = None,
    user_id: str | None = None,
) -> list[dict]:
    """
    Main retrieval entry point.

    1. MongoDB metadata filter (category / merchant / date / type)
    2. Regex text search
    3. Broad fallback if all above return nothing
    4. Weighted merge
    """

    clean_question = (question or "").strip()
    if not clean_question:
        raise ValueError("question is required")

    limit = top_k or settings.RAG_TOP_K
    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    metadata_hits: list[dict] = []
    regex_hits:    list[dict] = []

    # 1. Metadata filter
    try:
        if parsed:
            metadata_hits = _metadata_search(collection, parsed, user_id, limit)
    except Exception as exc:
        logger.warning("MongoDB metadata search failed: %s", exc)

    # 3. Regex search
    try:
        regex_hits = _regex_search(collection, clean_question, user_id, limit)
    except Exception as exc:
        logger.warning("Regex search failed: %s", exc)

    # 3. Merge
    merged = _merge_results(metadata_hits, regex_hits, limit)

    # 4. Broad fallback — if still nothing, return recent transactions
    if not merged:
        try:
            merged = _broad_search(collection, user_id, limit)
        except Exception as exc:
            logger.warning("Broad fallback search failed: %s", exc)

    return merged
