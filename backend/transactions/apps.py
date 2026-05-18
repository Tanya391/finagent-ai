from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'transactions'

    def ready(self):
        # Pre-load the embedding model at startup so the first user request
        # doesn't pay the 3-5 second cold-start penalty.
        try:
            from embeddings.embedding_service import _get_model
            _get_model()
        except Exception:
            pass  # Don't crash startup if model fails to load
