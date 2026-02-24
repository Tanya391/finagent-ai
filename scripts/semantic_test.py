import argparse
import os
import sys
from pathlib import Path


def bootstrap_django():
    project_root = Path(__file__).resolve().parents[1]
    backend_dir = project_root / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()


def semantic_search(query: str, top_k: int):
    from django.conf import settings

    from embeddings.embedding_service import generate_embedding
    from transactions.utils import get_db

    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]
    query_vector = generate_embedding(query)

    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": max(50, top_k * 10),
                "limit": top_k,
            }
        },
        {
            "$project": {
                "_id": 0,
                "transaction_id": 1,
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


def evaluate_results(results, expected_terms):
    if not expected_terms:
        return True, []

    matched = []
    haystacks = [
        f"{str(row.get('receiver') or '')} {str(row.get('description') or '')}".lower()
        for row in results
    ]
    for term in expected_terms:
        check = term.lower().strip()
        if any(check in text for text in haystacks):
            matched.append(term)

    return len(matched) > 0, matched


def main():
    parser = argparse.ArgumentParser(description="Semantic retrieval test against Atlas Vector Search.")
    parser.add_argument("--query", default="grocery", help="Natural-language query to test.")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return.")
    parser.add_argument(
        "--expect",
        nargs="*",
        default=[],
        help="Optional expected merchant/term values. Test passes if any expected term appears.",
    )
    args = parser.parse_args()

    bootstrap_django()
    results = semantic_search(query=args.query, top_k=args.top_k)

    print(f"Query: {args.query}")
    print(f"Top {len(results)} results:")
    for idx, row in enumerate(results, start=1):
        print(
            f"{idx}. receiver={row.get('receiver')} | description={row.get('description')} | "
            f"score={row.get('score')}"
        )

    passed, matched = evaluate_results(results, args.expect)
    if args.expect:
        if passed:
            print(f"PASS: matched expected term(s): {', '.join(matched)}")
        else:
            print(f"FAIL: none of expected terms matched: {', '.join(args.expect)}")
            raise SystemExit(1)
    else:
        print("No expectations provided. Retrieval run completed.")


if __name__ == "__main__":
    main()
