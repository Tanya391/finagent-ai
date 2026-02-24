from django.urls import path

from .views import ask_question, get_summary, health, ingest_sample_transactions, retrieve_transactions

urlpatterns = [
    path("health/", health, name="health"),
    path("ingest/", ingest_sample_transactions, name="ingest-sample"),
    path("summary/", get_summary, name="summary"),
    path("retrieve/", retrieve_transactions, name="retrieve-transactions"),
    path("ask/", ask_question, name="ask-question"),
]
