from django.urls import path
from .views import (
    AskQuestionView,
    StatusView,
    LoginView,
    LogoutView,
    RegisterView,
    RetrieveTransactionsView,
    MonthlySummaryView,
    CategoryBreakdownView,
    TopMerchantsView,
    CashflowView,
    SubscriptionsView,
    AnomaliesView,
)

urlpatterns = [
    # Health
    path("status/", StatusView.as_view(), name="status"),

    # Auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),

    # Core AI endpoints
    path("retrieve/", RetrieveTransactionsView.as_view(), name="retrieve-transactions"),
    path("ask/", AskQuestionView.as_view(), name="ask-question"),

    # Analytics endpoints
    path("monthly-summary/", MonthlySummaryView.as_view(), name="monthly-summary"),
    path("spending-by-category/", CategoryBreakdownView.as_view(), name="spending-by-category"),
    path("top-merchants/", TopMerchantsView.as_view(), name="top-merchants"),
    path("cashflow/", CashflowView.as_view(), name="cashflow"),
    path("subscriptions/", SubscriptionsView.as_view(), name="subscriptions"),
    path("anomalies/", AnomaliesView.as_view(), name="anomalies"),
]
