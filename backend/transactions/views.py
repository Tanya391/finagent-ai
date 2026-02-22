from django.http import JsonResponse
from django.conf import settings
from .services import ingest_csv
import os
from .utils import get_db

# Create your views here.

def test_ingestion(request):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(root_dir,"data","sample_transactions.csv")

    try:
        report = ingest_csv(file_path, return_report=True)
        return JsonResponse(
            {
                "message": f"{report['inserted_count']} records inserted successfully",
                "report": report,
            }
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

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
