import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.services.pey import HttpPeyClient


def _sent_amount_text(amount):
    bodies = []

    def respond(request):
        bodies.append(request.content.decode())
        return httpx.Response(201, json={"id": "qr-1", "qrString": "payload"})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        HttpPeyClient("test-key", client=http).create_qr(amount, "Café", "0001234", 360)
    return bodies[0]


def test_pey_amount_has_at_most_two_decimals():
    for raw, expected in [(19.990000000000002, 19.99), (0.1 + 0.2, 0.3), (0.01, 0.01), (35.5, 35.5), (1999 / 100, 19.99)]:
        body = _sent_amount_text(raw)
        assert json.loads(body)["amount"] == expected
        assert "0000000" not in body and "9999999" not in body
