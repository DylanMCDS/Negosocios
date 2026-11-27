import base64
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest
from standardwebhooks import Webhook

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.pey import (
    FakePeyClient, HttpPeyClient, PeyBadRequest, PeyError, PeyRateLimited,
    PeyServerError, PeyUnavailable, QrResult,
)
from app.services.pey_webhook import InvalidSignature, verify_webhook


def test_creates_qr_with_amount_concept_and_expiration():
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(201, json={"id": "qr-123", "qrString": "codi-payload"})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        result = HttpPeyClient("test-key", client=http).create_qr(12.50, "Café", "0001234", 360)
    assert result == QrResult("qr-123", "codi-payload")
    assert len(requests) == 1
    assert requests[0].method == "POST"
    assert str(requests[0].url) == "https://api.pey.mx/codi/qr"
    assert json.loads(requests[0].content) == {
        "amount": 12.50, "concept": "Café", "numRef": "0001234",
        "expiration": 360, "generateImage": False,
    }
    assert requests[0].extensions["timeout"]["read"] == 10.0


def test_sends_bearer_key_from_config():
    headers = []

    def respond(request):
        headers.append(request.headers)
        return httpx.Response(201, json={"id": "qr", "qrString": "payload"})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        HttpPeyClient("test-config-key", client=http).create_qr(1, "Venta", "1", 360)
    assert len(headers) == 1
    assert headers[0]["authorization"] == "Bearer test-config-key"


@pytest.mark.parametrize("status,error_type,exception", [
    (400, "INVALID_AMOUNT", PeyBadRequest),
    (429, "CALL_LIMIT_REACHED", PeyRateLimited),
    (500, "INTERNAL_ERROR", PeyServerError),
    (503, "UNAVAILABLE", PeyUnavailable),
])
def test_maps_429_to_rate_limited_error(status, error_type, exception):
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(status, json={"error": {
            "type": error_type, "requestId": "req-123", "message": "private detail",
        }})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        with pytest.raises(exception) as caught:
            HttpPeyClient("test-key", client=http).create_qr(1, "Venta", "1", 360)
    assert caught.value.status_code == status
    assert caught.value.error_type == error_type
    assert caught.value.request_id == "req-123"
    assert "private detail" not in str(caught.value)
    assert len(calls) == 1


@pytest.mark.parametrize("failure", ["timeout", "invalid-json", "missing-fields"])
def test_sanitizes_transport_and_malformed_response_errors(failure):
    calls = []

    def respond(request):
        calls.append(request)
        if failure == "timeout":
            raise httpx.ReadTimeout("private detail", request=request)
        if failure == "invalid-json":
            return httpx.Response(201, text="private detail")
        return httpx.Response(201, json={"id": "qr"})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        with pytest.raises(PeyError) as caught:
            HttpPeyClient("test-key", client=http).create_qr(1, "Venta", "1", 360)
    assert "private detail" not in str(caught.value)
    assert "test-key" not in str(caught.value)
    assert len(calls) == 1


def signed_event(age=timedelta()):
    secret = "whsec_" + base64.b64encode(b"offline-test-signing-material").decode()
    body = b'{ "type": "codi.qr.payment_received", "data": {"amount": 1, "codiQrId": "qr"} }'
    timestamp = datetime.now(timezone.utc).replace(microsecond=0) - age
    headers = {
        "webhook-id": "evt-1", "webhook-timestamp": str(int(timestamp.timestamp())),
        "webhook-signature": Webhook(secret).sign("evt-1", timestamp, body.decode()),
    }
    return body, headers, secret


def test_verifies_valid_webhook_signature():
    body, headers, secret = signed_event()
    assert verify_webhook(body, headers, secret) == json.loads(body)


def test_rejects_tampered_webhook_body():
    body, headers, secret = signed_event()
    with pytest.raises(InvalidSignature):
        verify_webhook(body.replace(b'"amount": 1', b'"amount": 2'), headers, secret)


def test_rejects_expired_webhook_signature():
    body, headers, secret = signed_event(timedelta(minutes=10))
    with pytest.raises(InvalidSignature):
        verify_webhook(body, headers, secret)


def test_accepts_case_insensitive_webhook_headers():
    body, headers, secret = signed_event()
    assert verify_webhook(body, {k.title(): v for k, v in headers.items()}, secret) == json.loads(body)


def test_rejects_missing_signature_headers():
    body, _, secret = signed_event()
    with pytest.raises(InvalidSignature):
        verify_webhook(body, {}, secret)


def test_fake_records_requests_and_returns_distinct_demo_qrs():
    fake = FakePeyClient()
    first = fake.create_qr(1, "Venta", "1", 360)
    second = fake.create_qr(2, "Otra", "2", 720)
    assert first == QrResult("fake-qr-1", "demo_data:true:fake-qr-1")
    assert second.id == "fake-qr-2"
    assert fake.requests == [
        {"amount": 1, "concept": "Venta", "numRef": "1", "expiration": 360},
        {"amount": 2, "concept": "Otra", "numRef": "2", "expiration": 720},
    ]


@pytest.mark.parametrize("status,exception", [
    (400, PeyBadRequest), (429, PeyRateLimited),
    (500, PeyServerError), (503, PeyUnavailable),
])
def test_maps_non_json_provider_errors_by_http_status(status, exception):
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(status, text="private proxy error test-key")

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        with pytest.raises(PeyError) as caught:
            HttpPeyClient("test-key", client=http).create_qr(1, "Venta", "1", 360)
    assert isinstance(caught.value, exception)
    assert caught.value.status_code == status
    assert caught.value.error_type == "UNKNOWN_ERROR"
    assert caught.value.request_id is None
    assert "private" not in str(caught.value)
    assert "test-key" not in str(caught.value)
    assert len(requests) == 1
