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


def _build_text(doc):
    semantic_text = str(doc.get("semantic_text") or "").strip()
    if semantic_text:
        return semantic_text

    parts = [
        str(doc.get("receiver") or "").strip(),
        str(doc.get("description") or "").strip(),
        str(doc.get("transaction_type") or "").strip(),
    ]
    text = " ".join(part for part in parts if part)
    return text or None


def run(force=False):
    from django.conf import settings

    from embeddings.embedding_service import generate_embedding
    from transactions.utils import get_db

    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    missing_embedding_query = {
        "$or": [
            {"embedding": {"$exists": False}},
            {"embedding": None},
            {"embedding": []},
        ]
    }
    query = {} if force else missing_embedding_query

    processed = 0
    skipped_no_text = 0
    failures = 0

    for doc in collection.find(query):
        text = _build_text(doc)
        if not text:
            skipped_no_text += 1
            continue

        try:
            embedding = generate_embedding(text)
            update_fields = {"embedding": embedding}
            if not str(doc.get("semantic_text") or "").strip():
                update_fields["semantic_text"] = text

            collection.update_one({"_id": doc["_id"]}, {"$set": update_fields})
            processed += 1
            if processed % 50 == 0:
                print(f"Processed {processed}")
        except Exception as exc:
            failures += 1
            print(f"Failed for doc {doc.get('_id')}: {exc}")

    remaining = collection.count_documents(
        {
            "$and": [
                {
                    "$or": [
                        {"semantic_text": {"$exists": True, "$ne": ""}},
                        {"receiver": {"$exists": True, "$ne": ""}},
                        {"description": {"$exists": True, "$ne": ""}},
                        {"transaction_type": {"$exists": True, "$ne": ""}},
                    ]
                },
                missing_embedding_query,
            ]
        }
    )

    print(
        "Embedding job finished. "
        f"processed={processed}, skipped_no_text={skipped_no_text}, failures={failures}, remaining={remaining}"
    )
    if remaining == 0:
        print("All text-bearing documents are embedded.")


def main():
    parser = argparse.ArgumentParser(description="Generate missing embeddings for transactions.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild embeddings for all records, not just missing ones.",
    )
    args = parser.parse_args()

    bootstrap_django()
    run(force=args.force)


if __name__ == "__main__":
    main()
