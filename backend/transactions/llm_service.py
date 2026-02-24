import json
import urllib.error
import urllib.request

from django.conf import settings

from .prompts import build_grounded_prompt


class ProviderError(Exception):
    def __init__(self, provider: str, message: str, retryable: bool = True, status_code: int | None = None):
        super().__init__(message)
        self.provider = provider
        self.retryable = retryable
        self.status_code = status_code


def _request_json(url: str, payload: dict, headers: dict, timeout_sec: int):
    merged_headers = {
        "Accept": "application/json",
        "User-Agent": "finagent-ai-bot/1.0",
    }
    merged_headers.update(headers or {})

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=merged_headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _call_groq(prompt: str):
    provider = "groq"
    if not settings.GROQ_API_KEY:
        raise ProviderError(provider, "GROQ_API_KEY is missing", retryable=True)

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
    }

    try:
        body = _request_json(url, payload, headers, settings.LLM_TIMEOUT_SEC)
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            raise ProviderError(provider, "Groq returned empty text", retryable=True)
        return text, settings.GROQ_MODEL
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        retryable = exc.code in {408, 409, 425, 429} or exc.code >= 500
        raise ProviderError(provider, f"Groq HTTP error: {exc.code} {detail}", retryable=retryable, status_code=exc.code) from exc
    except urllib.error.URLError as exc:
        raise ProviderError(provider, f"Groq network error: {exc}", retryable=True) from exc


def _call_huggingface(prompt: str):
    provider = "huggingface"
    if not settings.HF_API_KEY:
        raise ProviderError(provider, "HF_API_KEY is missing", retryable=True)

    payload = {
        "model": settings.HF_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.HF_API_KEY}",
    }

    try:
        body = _request_json(settings.HF_BASE_URL, payload, headers, settings.LLM_TIMEOUT_SEC)
        text = body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not text:
            raise ProviderError(provider, "Hugging Face returned empty text", retryable=True)
        return text, settings.HF_MODEL
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        retryable = exc.code in {408, 409, 425, 429} or exc.code >= 500
        raise ProviderError(provider, f"Hugging Face HTTP error: {exc.code} {detail}", retryable=retryable, status_code=exc.code) from exc
    except urllib.error.URLError as exc:
        raise ProviderError(provider, f"Hugging Face network error: {exc}", retryable=True) from exc


def answer_question_with_context(question: str, transactions: list[dict]) -> dict:
    if not transactions:
        return {
            "answer": "I do not have enough relevant transaction data to answer this confidently.",
            "provider_used": "none",
            "model_used": "none",
            "fallback_count": 0,
            "provider_errors": [],
        }

    prompt = build_grounded_prompt(question=question, transactions=transactions)
    provider_map = {
        "groq": _call_groq,
        "huggingface": _call_huggingface,
    }

    order = settings.LLM_FALLBACK_ORDER or ["groq", "huggingface"]
    errors = []

    for idx, provider in enumerate(order):
        key = provider.lower().strip()
        fn = provider_map.get(key)
        if not fn:
            errors.append({"provider": key, "error": "unsupported provider in LLM_FALLBACK_ORDER"})
            continue

        try:
            answer_text, model_name = fn(prompt)
            return {
                "answer": answer_text,
                "provider_used": key,
                "model_used": model_name,
                "fallback_count": idx,
                "provider_errors": errors,
            }
        except ProviderError as exc:
            errors.append({"provider": key, "error": str(exc), "retryable": exc.retryable})
            if not exc.retryable:
                break

    raise RuntimeError(f"All LLM providers failed: {errors}")
