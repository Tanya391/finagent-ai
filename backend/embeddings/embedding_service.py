from functools import lru_cache

from django.conf import settings
from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=1)
def _get_model():
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def generate_embedding(text: str):
    clean_text = (text or "").strip()
    if not clean_text:
        raise ValueError("Text cannot be empty for embedding generation.")
    return _get_model().encode(clean_text).tolist()
