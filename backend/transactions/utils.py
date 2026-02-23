from django.conf import settings
from pymongo import MongoClient


_CLIENT = None
_INDEXES_READY = False


def reset_client_cache():
    global _CLIENT, _INDEXES_READY
    _CLIENT = None
    _INDEXES_READY = False


def _build_tls_kwargs(mongo_uri: str) -> dict:
    kwargs = {
        "serverSelectionTimeoutMS": settings.MONGO_SERVER_SELECTION_TIMEOUT_MS,
        "connectTimeoutMS": settings.MONGO_CONNECT_TIMEOUT_MS,
        "socketTimeoutMS": settings.MONGO_SOCKET_TIMEOUT_MS,
    }

    if mongo_uri.startswith("mongodb+srv://"):
        allow_invalid_certs = settings.MONGO_TLS_ALLOW_INVALID_CERTS
        disable_ocsp = settings.MONGO_TLS_DISABLE_OCSP
        if allow_invalid_certs and disable_ocsp:
            disable_ocsp = False

        if allow_invalid_certs:
            kwargs["tlsAllowInvalidCertificates"] = True
        elif disable_ocsp:
            kwargs["tlsDisableOCSPEndpointCheck"] = True

        try:
            import certifi

            kwargs["tls"] = True
            kwargs["tlsCAFile"] = certifi.where()
        except Exception:
            pass

    return kwargs


def _build_client():
    primary_uri = (settings.MONGO_URI or "").strip()
    if not primary_uri:
        raise RuntimeError("MONGO_URI is missing. Add it in backend/.env.")

    fallback_uri = (getattr(settings, "MONGO_URI_FALLBACK", "") or "").strip()
    uris_to_try = [primary_uri] + ([fallback_uri] if fallback_uri else [])
    last_error = None

    for mongo_uri in uris_to_try:
        kwargs = _build_tls_kwargs(mongo_uri)
        client = MongoClient(mongo_uri, **kwargs)

        try:
            client.admin.command("ping")
            return client
        except Exception as primary_error:
            last_error = primary_error
            if not mongo_uri.startswith("mongodb+srv://"):
                continue

            # Atlas TLS fallback for local dev environments that fail strict handshake checks.
            relaxed_kwargs = dict(kwargs)
            relaxed_kwargs["tls"] = True
            relaxed_kwargs["tlsAllowInvalidCertificates"] = True
            relaxed_kwargs.pop("tlsDisableOCSPEndpointCheck", None)
            relaxed_kwargs.pop("tlsCAFile", None)

            relaxed_client = MongoClient(mongo_uri, **relaxed_kwargs)
            try:
                relaxed_client.admin.command("ping")
                return relaxed_client
            except Exception as relaxed_error:
                last_error = relaxed_error
                continue

    raise RuntimeError(
        "Could not connect to MongoDB. "
        "If you are using Atlas, ensure your current IP is allowed in Atlas Network Access and "
        "set MONGO_TLS_DISABLE_OCSP=true in backend/.env. "
        "You can also set MONGO_URI_FALLBACK=mongodb://127.0.0.1:27017 to use local MongoDB. "
        f"Last error: {last_error}"
    ) from last_error


def get_db():
    global _CLIENT, _INDEXES_READY
    if _CLIENT is None:
        _CLIENT = _build_client()

    if not settings.DB_NAME:
        raise RuntimeError("DB_NAME is missing. Add it in backend/.env.")

    db = _CLIENT[settings.DB_NAME]
    collection_name = settings.MONGO_TRANSACTIONS_COLLECTION
    collection = db[collection_name]

    if not _INDEXES_READY:
        collection.create_index(
            [("transaction_id", 1)],
            name="transaction_id_unique_non_null",
            unique=True,
            partialFilterExpression={"transaction_id": {"$type": "string"}},
        )
        collection.create_index("date")
        collection.create_index("receiver")
        collection.create_index("category")
        _INDEXES_READY = True

    return db
