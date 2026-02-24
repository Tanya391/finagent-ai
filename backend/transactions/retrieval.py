from django.conf import settings

from .utils import get_db


def retrieve_transactions_for_query(question: str, top_k: int | None = None):
    from embeddings.embedding_service import generate_embedding

    clean_question = (question or "").strip()
    if not clean_question:
        raise ValueError("question is required")

    limit = top_k or settings.RAG_TOP_K
    query_vector = generate_embedding(clean_question)

    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": max(50, limit * 10),
                "limit": limit,
            }
        },
        {
            "$project": {
                "_id": 0,
                "transaction_id": 1,
                "date": 1,
                "receiver": 1,
                "description": 1,
                "amount": 1,
                "transaction_type": 1,
                "category": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    return list(collection.aggregate(pipeline))
