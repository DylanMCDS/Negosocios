from standardwebhooks import Webhook
from standardwebhooks.webhooks import WebhookVerificationError as InvalidSignature


def verify_webhook(raw_body: bytes, headers: dict[str, str], secret: str):
    """Verify original bytes and timestamp; callers persist webhook-id for deduplication."""
    return Webhook(secret).verify(raw_body, {key.lower(): value for key, value in headers.items()})
