"""
Qdrant vector search service.
Replaces MongoDB Atlas $vectorSearch.

Responsibilities:
  - Upsert transaction vectors into Qdrant
  - Search top-K similar transactions by query embedding
  - Filter by user_id, category, merchant, transaction_type, date range

Qdrant stores: vector + payload (transaction_id, user_id, category,
               normalized_merchant, transaction_type, date)
Full transaction documents are fetched from MongoDB after retrieval.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

_qdrant_client = None


def _get_client():
    global _qdrant_client
    if _qdrant_client is not None:
        return _qdrant_client

    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams

        host = getattr(settings, "QDRANT_HOST", "localhost")
        port = int(getattr(settings, "QDRANT_PORT", 6333))
        api_key = getattr(settings, "QDRANT_API_KEY", "") or None
        url = getattr(settings, "QDRANT_URL", "") or None

        if url:
            client = QdrantClient(url=url, api_key=api_key)
        else:
            client = QdrantClient(host=host, port=port, api_key=api_key)

        collection_name = getattr(settings, "QDRANT_COLLECTION", "transactions")
        vector_size = int(getattr(settings, "QDRANT_VECTOR_SIZE", 384))  # all-MiniLM-L6-v2 = 384

        # Create collection if it doesn't exist
        existing = [c.name for c in client.get_collections().collections]
        if collection_name not in existing:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )
            logger.info("Created Qdrant collection: %s", collection_name)

        _qdrant_client = client
        return _qdrant_client

    except Exception as exc:
        logger.warning("Qdrant unavailable: %s", exc)
        return None


def upsert_vector(
    transaction_id: str,
    vector: list[float],
    user_id: str | None,
    category: str,
    normalized_merchant: str,
    transaction_type: str,
    transaction_date: str,
) -> bool:
    """
    Upsert a single transaction vector into Qdrant.
    Returns True on success, False if Qdrant is unavailable.
    """
    client = _get_client()
    if client is None:
        return False

    try:
        from qdrant_client.models import PointStruct

        collection_name = getattr(settings, "QDRANT_COLLECTION", "transactions")

        # Use a deterministic integer ID derived from transaction_id hash
        point_id = abs(hash(transaction_id)) % (2**63)

        client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "transaction_id": transaction_id,
                        "user_id": user_id or "anonymous",
                        "category": category,
                        "normalized_merchant": normalized_merchant,
                        "transaction_type": transaction_type,
                        "date": transaction_date,
                    },
                )
            ],
        )
        return True
    except Exception as exc:
        logger.warning("Qdrant upsert failed for %s: %s", transaction_id, exc)
        return False


def search_vectors(
    query_vector: list[float],
    top_k: int,
    user_id: str | None = None,
    category: str | None = None,
    normalized_merchant: str | None = None,
    transaction_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, Any]]:
    """
    Search Qdrant for top-K similar transactions.
    Returns list of payloads with score attached.
    Returns empty list if Qdrant is unavailable (caller handles fallback).
    """
    client = _get_client()
    if client is None:
        return []

    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue, Range, Must

        collection_name = getattr(settings, "QDRANT_COLLECTION", "transactions")

        # Build filter conditions
        must_conditions = []

        if user_id:
            must_conditions.append(
                FieldCondition(key="user_id", match=MatchValue(value=user_id))
            )

        if category:
            must_conditions.append(
                FieldCondition(key="category", match=MatchValue(value=category))
            )

        if normalized_merchant:
            must_conditions.append(
                FieldCondition(key="normalized_merchant", match=MatchValue(value=normalized_merchant))
            )

        if transaction_type:
            must_conditions.append(
                FieldCondition(key="transaction_type", match=MatchValue(value=transaction_type))
            )

        if date_from or date_to:
            range_kwargs = {}
            if date_from:
                range_kwargs["gte"] = date_from.isoformat()
            if date_to:
                range_kwargs["lte"] = date_to.isoformat()
            must_conditions.append(
                FieldCondition(key="date", range=Range(**range_kwargs))
            )

        query_filter = Filter(must=must_conditions) if must_conditions else None

        results = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_k,
            query_filter=query_filter,
            with_payload=True,
        )

        return [
            {
                **hit.payload,
                "vector_score": round(hit.score, 4),
            }
            for hit in results
        ]

    except Exception as exc:
        logger.warning("Qdrant search failed: %s", exc)
        return []


def is_available() -> bool:
    """Returns True if Qdrant client is reachable."""
    return _get_client() is not None
