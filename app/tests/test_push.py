import base64
import json
from datetime import datetime, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from standardwebhooks import Webhook

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app
from app.routers.orders import get_pey_client
from app.services.pey import FakePeyClient, HttpPeyClient

SECRET = "whsec_" + base64.b64encode(b"offline-test-signing-material").decode()


@pytest.fixture
def api(tmp_path):
    path = str(tmp_path / "push.db")
    fake = FakePeyClient()
    settings = Settings(database_path=path, pey_webhook_secret=SECRET)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: fake
    conn = connect(path)
    init_db(conn)
    conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES ('b1', 'N', 'C', 'Z')")
    for oid, status in (("1234", "pending"), ("5678", "paid")):
        conn.execute(
            "INSERT INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, codi_qr_id, created_at)"
            " VALUES (?, 'b1', 1050, 'Tacos', ?, ?, ?, '2026-11-26T10:00:00-06:00')", (oid, status, f"k{oid}", f"qr-{oid}"))
    conn.commit()
    with TestClient(application) as client:
        yield client, conn, fake
    conn.close()


def push(client, phone="5512345678", order="1234"):
    return client.post(f"/api/orders/{order}/push", json={"phone": phone})


def webhook(client, **over):
    # pey's real push payload is FLAT (docs.pey.mx webhooks/codi/pn): no codiQrId, no `data` wrapper.
    body = json.dumps({"type": "codi.pn.payment_received", "amount": 10.5, "apiKeyId": "key", "concept": "Tacos", "datePaid": 1790724758,
                       "metadata": {}, "numRef": "1234", "transactionId": "fake-pn-1", **over})
    now = datetime.now(timezone.utc).replace(microsecond=0)
    headers = {"webhook-id": over.get("webhook_id", "evt-pn-1"), "webhook-timestamp": str(int(now.timestamp())),
               "webhook-signature": Webhook(SECRET).sign(over.get("webhook_id", "evt-pn-1"), now, body), "content-type": "application/json"}
    return client.post("/api/webhooks/pey", content=body, headers=headers)


def order(conn, oid="1234"):
    return dict(conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone())


def test_sends_push_with_phone_and_amount(api):
    client, conn, fake = api
    r = push(client)
    assert r.status_code == 200 and r.json()["sent"] is True
    assert fake.pushes == [{"phone": "5512345678", "amount": 10.5, "concept": "Tacos", "numRef": "1234", "expiration": 360}]
    assert "5512345678" not in json.dumps(r.json())  # the full phone number is never echoed back
    # The real adapter follows docs.pey.mx create-push-notification: POST /codi/pn, 10-digit phoneNumber, 2-decimal amount.
    seen = []

    def respond(request):
        seen.append(request)
        return httpx.Response(200, json={"transactionId": "01J5KXYZ", "codiId": "12345678901234567890"})

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        result = HttpPeyClient("test-key", client=http).create_push("5512345678", 19.990000000000002, "Tacos", "1234", 360)
    assert (result.transaction_id, result.codi_id) == ("01J5KXYZ", "12345678901234567890")
    assert str(seen[0].url) == "https://api.pey.mx/codi/pn"
    assert json.loads(seen[0].content) == {"amount": 19.99, "phoneNumber": "5512345678", "concept": "Tacos", "numRef": "1234", "expiration": 360}


def test_push_payment_webhook_marks_order_paid(api):
    client, conn, _ = api
    assert push(client).status_code == 200
    r = webhook(client)
    assert r.status_code == 200 and r.json() == {"ok": True}
    o = order(conn)
    assert o["status"] == "paid" and o["paid_at"] and o["reconciliation_required"] == 0
    p = dict(conn.execute("SELECT * FROM payments").fetchone())
    assert (p["order_id"], p["transaction_id"], p["amount_cents"]) == ("1234", "fake-pn-1", 1050)
    assert webhook(client).status_code == 200  # same webhook-id: processed once
    assert conn.execute("SELECT COUNT(*) FROM payments").fetchone()[0] == 1
    # A push payment whose transaction we never sent is recorded and ignored, and a wrong amount is flagged, not paid.
    conn.execute("UPDATE orders SET status = 'pending', paid_at = NULL WHERE id = '1234'")
    conn.execute("DELETE FROM payments")
    conn.commit()
    assert webhook(client, webhook_id="evt-2", transactionId="never-sent").status_code == 200
    assert order(conn)["status"] == "pending"
    assert webhook(client, webhook_id="evt-3", amount=9.99).status_code == 200
    flagged = order(conn)
    assert flagged["status"] == "pending" and flagged["reconciliation_required"] == 1


def test_rejects_invalid_phone(api):
    client, _, fake = api
    for bad in ("12345", "55123456789", "55 1234 5678", "55123abcde", "", "+525512345678"):
        assert push(client, phone=bad).status_code == 422, bad
    assert push(client, order="ghost").status_code == 404
    assert push(client, order="5678").status_code == 409  # already paid: nothing to ask the payer for
    assert fake.pushes == []
