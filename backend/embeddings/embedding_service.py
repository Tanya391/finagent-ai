from django.conf import settings
from sentence_transformers import SentenceTransformer


_model = None
def _get_model():
    global _model#updates _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def generate_embedding(text: str):
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Text cannot be empty for embedding generation.")
    return _get_model().encode(clean_text).tolist()
