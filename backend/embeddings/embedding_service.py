from django.conf import settings

_model = None
_available = None


def _is_available() -> bool:
    global _available
    if _available is None:
        try:
            from sentence_transformers import SentenceTransformer  # noqa
            _available = True
        except ImportError:
            _available = False
    return _available


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def generate_embedding(text: str) -> list[float]:
    if not _is_available():
        raise ImportError(
            "sentence-transformers is not installed. "
            "Vector search is unavailable — retrieval will use regex fallback."
        )
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Text cannot be empty for embedding generation.")
    return _get_model().encode(clean_text).tolist()
