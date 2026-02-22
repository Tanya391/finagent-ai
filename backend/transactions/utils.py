from django.conf import settings
from pymongo import MongoClient


_CLIENT = None


def reset_client_cache():
    global _CLIENT
    _CLIENT = None


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
    mongo_uri = settings.MONGO_URI or ""
    kwargs = _build_tls_kwargs(mongo_uri)
    return MongoClient(mongo_uri, **kwargs)


def get_db():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = _build_client()

    db = _CLIENT[settings.DB_NAME]
    collection_name = settings.MONGO_TRANSACTIONS_COLLECTION
    collection = db[collection_name]
    collection.create_index(
        [("transaction_id", 1)],
        name="transaction_id_unique_non_null",
        unique=True,
        partialFilterExpression={"transaction_id": {"$type": "string"}},
    )
    collection.create_index("date")
    collection.create_index("receiver")
    collection.create_index("category")
    return db
