from django.urls import path
from .views import get_summary, health, ingest_sample_transactions

urlpatterns = [
    path("health/", health, name="health"),
    path("ingest/", ingest_sample_transactions, name="ingest-sample"),
    path("summary/", get_summary, name="summary"),
]
