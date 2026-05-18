import hashlib
import requests
from django.conf import settings
from rest_framework.exceptions import APIException
from .prompts import build_grounded_prompt

# ---------------------------------------------------------------------------
# Simple in-memory response cache
# Caches LLM answers by (question + transaction IDs) so repeated identical
# queries don't make a second network call to Groq.
# Cache is cleared on server restart — no persistence needed for dev.
# ---------------------------------------------------------------------------
_RESPONSE_CACHE: dict[str, dict] = {}
_CACHE_MAX_SIZE = 200


def _cache_key(question: str, transactions: list[dict]) -> str:
    ids = ",".join(t.get("transaction_id", "") for t in transactions)
    raw = f"{question.strip().lower()}|{ids}"
    return hashlib.md5(raw.encode()).hexdigest()


def _get_cached(key: str) -> dict | None:
    return _RESPONSE_CACHE.get(key)


def _set_cached(key: str, value: dict) -> None:
    if len(_RESPONSE_CACHE) >= _CACHE_MAX_SIZE:
        # Evict oldest entry
        oldest = next(iter(_RESPONSE_CACHE))
        del _RESPONSE_CACHE[oldest]
    _RESPONSE_CACHE[key] = value


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------
def _request_json(url: str, payload: dict, headers: dict, timeout_sec: int) -> dict:
    response = requests.post(url, json=payload, headers=headers, timeout=timeout_sec)
    response.raise_for_status()
    return response.json()


# ---------------------------------------------------------------------------
# Groq
# ---------------------------------------------------------------------------
def _call_groq(prompt: str) -> str:
    if not settings.GROQ_API_KEY:
        raise APIException("GROQ_API_KEY is missing")

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 512,   # cap output length — faster responses
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
    }

    try:
        body = _request_json(
            "https://api.groq.com/openai/v1/chat/completions",
            payload, headers,
            settings.LLM_TIMEOUT_SEC,
        )
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            raise APIException("Groq returned empty text")
        return text
    except Exception as err:
        raise APIException(f"Groq request failed: {err}") from err


# ---------------------------------------------------------------------------
# Hugging Face
# ---------------------------------------------------------------------------
def _call_huggingface(prompt: str) -> str:
    if not settings.HF_API_KEY:
        raise APIException("HF_API_KEY is missing")

    payload = {
        "model": settings.HF_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 512,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.HF_API_KEY}",
    }

    try:
        body = _request_json(
            settings.HF_BASE_URL, payload, headers, settings.LLM_TIMEOUT_SEC
        )
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            raise APIException("Hugging Face returned empty text")
        return text
    except Exception as err:
        raise APIException(f"Hugging Face request failed: {err}") from err


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def answer_question_with_context(question: str, transactions: list[dict]) -> dict:
    if not transactions:
        return {
            "answer": "I do not have enough relevant transaction data to answer this confidently.",
            "provider": "none",
            "provider_errors": [],
        }

    # Check cache first
    cache_key = _cache_key(question, transactions)
    cached = _get_cached(cache_key)
    if cached:
        return {**cached, "cached": True}

    prompt = build_grounded_prompt(question=question, transactions=transactions)

    provider_map = {
        "groq": _call_groq,
        "huggingface": _call_huggingface,
    }
    order = settings.LLM_FALLBACK_ORDER or ["groq", "huggingface"]
    errors = []

    for provider in order:
        key = provider.lower().strip()
        fn = provider_map.get(key)
        if not fn:
            errors.append({"provider": key, "error": "unsupported provider"})
            continue
        try:
            answer_text = fn(prompt)
            result = {
                "answer": answer_text,
                "provider": key,
                "provider_errors": errors,
            }
            _set_cached(cache_key, result)
            return result
        except APIException as err:
            errors.append({"provider": key, "error": str(err)})
            continue

    raise RuntimeError(f"All LLM providers failed: {errors}")
