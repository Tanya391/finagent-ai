import json
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .llm_service import answer_question_with_context
from .retrieval import retrieve_transactions_for_query
from .services import ingest_csv
from .utils import get_db


SAMPLE_CSV_PATH = Path(settings.BASE_DIR).parent / "data" / "sample_transactions.csv"


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON body")


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@require_GET
def ingest_sample_transactions(request):
    if not SAMPLE_CSV_PATH.exists():
        return JsonResponse(
            {"error": f"Sample CSV not found at: {SAMPLE_CSV_PATH}"},
            status=404,
        )

    try:
        report = ingest_csv(str(SAMPLE_CSV_PATH), return_report=True)
        return JsonResponse(
            {
                "message": f"{report['inserted_count']} records inserted successfully",
                "report": report,
            }
        )
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


@require_GET
def get_summary(request):
    db = get_db()
    collection = db[settings.MONGO_TRANSACTIONS_COLLECTION]

    by_type = list(
        collection.aggregate(
            [
                {"$group": {"_id": "$transaction_type", "total": {"$sum": "$amount"}}},
                {"$sort": {"_id": 1}},
            ]
        )
    )
    by_category = list(
        collection.aggregate(
            [
                {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
                {"$sort": {"_id": 1}},
            ]
        )
    )

    return JsonResponse({"summary_by_type": by_type, "summary_by_category": by_category})


@csrf_exempt
@require_POST
def retrieve_transactions(request):
    try:
        payload = _parse_json_body(request)
        question = str(payload.get("question") or "").strip()
        top_k = int(payload.get("k") or settings.RAG_TOP_K)
        if top_k <= 0:
            raise ValueError("k must be greater than 0")

        results = retrieve_transactions_for_query(question=question, top_k=top_k)
        return JsonResponse(
            {
                "question": question,
                "top_k": top_k,
                "count": len(results),
                "results": results,
            }
        )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


@csrf_exempt
@require_POST
def ask_question(request):
    try:
        payload = _parse_json_body(request)
        question = str(payload.get("question") or "").strip()
        top_k = int(payload.get("k") or settings.RAG_TOP_K)
        if not question:
            raise ValueError("question is required")
        if top_k <= 0:
            raise ValueError("k must be greater than 0")

        transactions = retrieve_transactions_for_query(question=question, top_k=top_k)
        llm_result = answer_question_with_context(question=question, transactions=transactions)

        return JsonResponse(
            {
                "question": question,
                "top_k": top_k,
                "answer": llm_result.get("answer"),
                "provider_used": llm_result.get("provider_used"),
                "model_used": llm_result.get("model_used"),
                "fallback_count": llm_result.get("fallback_count"),
                "provider_errors": llm_result.get("provider_errors", []),
                "sources": transactions,
                "source_count": len(transactions),
            }
        )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)
