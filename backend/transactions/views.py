from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .services import ingest_csv
from .utils import get_db


SAMPLE_CSV_PATH = Path(settings.BASE_DIR).parent / "data" / "sample_transactions.csv"


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
