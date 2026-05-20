from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'transactions'

    def ready(self):
        # Pre-load the embedding model at startup only if available
        # In production (Docker), sentence-transformers may not be installed
        try:
            from embeddings.embedding_service import _is_available, _get_model
            if _is_available():
                _get_model()
        except Exception:
            pass
