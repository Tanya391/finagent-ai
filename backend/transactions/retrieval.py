"""
Hybrid Retrieval Engine.

Priority:
  1. Qdrant vector search (with metadata filters from parsed query)
  2. MongoDB metadata filter (category / merchant / date / type)
  3. Regex text search fallback
  4. Broad fallback — return recent transactions when nothing else matches

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
    vector_hits: list[dict],
    metadata_hits: list[dict],
    regex_hits: list[dict],
    limit: int,
) -> list[dict]:
    """
    Weighted merge and deduplication.
    final_score = 0.6 * vector + 0.3 * metadata + 0.1 * regex
    """
    scores: dict[str, dict] = {}

    for hit in vector_hits:
        tid = hit.get("transaction_id")
        if not tid:
            continue
        scores[tid] = {**hit, "final_score": round(0.6 * hit.get("vector_score", 0), 4)}

    for hit in metadata_hits:
        tid = hit.get("transaction_id")
        if not tid:
            continue
        if tid in scores:
            scores[tid]["final_score"] = round(scores[tid]["final_score"] + 0.3, 4)
        else:
            scores[tid] = {**hit, "final_score": 0.3}

    for hit in regex_hits:
        tid = hit.get("transaction_id")
        if not tid:
            continue
        bonus = hit.get("regex_score", 0.1) * 0.1
        if tid in scores:
            scores[tid]["final_score"] = round(scores[tid]["final_score"] + bonus, 4)
        else:
            scores[tid] = {**hit, "final_score": round(bonus, 4)}

    merged = sorted(scores.values(), key=lambda x: x.get("final_score", 0), reverse=True)

    for item in merged:
        item.pop("vector_score", None)
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

    1. Qdrant vector search (skipped if Qdrant unavailable)
    2. MongoDB metadata filter (category / merchant / date / type)
    3. Regex text search
    4. Broad fallback if all above return nothing
    5. Weighted merge
    """
    from embeddings.embedding_service import generate_embedding
    from .qdrant_service import search_vectors, is_available as qdrant_available

    clean_question = (question or "").strip()
    if not clean_question:
        raise ValueError("question is required")

    limit = top_k or settings.RAG_TOP_K
    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    vector_hits:   list[dict] = []
    metadata_hits: list[dict] = []
    regex_hits:    list[dict] = []

    # 1. Qdrant
    try:
        if qdrant_available():
            query_vector = generate_embedding(clean_question)
            qdrant_results = search_vectors(
                query_vector=query_vector,
                top_k=limit,
                user_id=user_id,
                category=parsed.category if parsed else None,
                normalized_merchant=parsed.merchant if parsed else None,
                transaction_type=parsed.transaction_type if parsed else None,
                date_from=parsed.date_from if parsed else None,
                date_to=parsed.date_to if parsed else None,
            )
            if qdrant_results:
                ids = [r["transaction_id"] for r in qdrant_results if r.get("transaction_id")]
                full_docs = _fetch_by_ids(collection, ids)
                for r in qdrant_results:
                    tid = r.get("transaction_id")
                    if tid and tid in full_docs:
                        doc = full_docs[tid]
                        doc["vector_score"] = r.get("vector_score", 0)
                        vector_hits.append(doc)
    except Exception as exc:
        logger.warning("Qdrant retrieval failed, continuing with fallbacks: %s", exc)

    # 2. Metadata filter
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

    # 4. Merge
    merged = _merge_results(vector_hits, metadata_hits, regex_hits, limit)

    # 5. Broad fallback — if still nothing, return recent transactions
    if not merged:
        try:
            merged = _broad_search(collection, user_id, limit)
        except Exception as exc:
            logger.warning("Broad fallback search failed: %s", exc)

    return merged
