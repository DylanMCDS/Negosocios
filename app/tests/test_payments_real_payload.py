"""Regresión: el webhook real de pey es PLANO (sin "data"). Ejemplo literal de
https://docs.pey.mx/en/docs/webhooks/codi/qr/ (cobro real de 1 MXN en Render, 2026-11-26)."""
import base64
import json
import logging
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from standardwebhooks import Webhook

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app

SECRET = "whsec_" + base64.b64encode(b"offline-test-signing-material").decode()

# Ejemplo literal de la documentación de pey.
PEY_EXAMPLE = {
    "amount": 150,
    "apiKeyId": "01M3QMMR6X9CBVDY1SF3G8QWNW",
    "bankAccountId": "01JBAVWE4NS5TGXHWGMX3KH23Q",
    "codiQrId": "35a13c183a",
    "concept": "(dev) Order 345",
    "datePaid": 1790724818,
    "metadata": {
        "clabe": "000000000000000000",
        "bankCode": 40012,
        "accountType": 40,
        "description": "(dev) Order 345",
        "trackingKey": "0192191042",
        "externalMetadata": {"orderId": "12345", "customerEmail": "customer@example.com"},
    },
    "numRef": "34567",
    "transactionId": "01M3QR8H0RH0XBCKYYD242YXNV",
    "type": "codi.qr.payment_received",
}


@pytest.fixture
def api(tmp_path):
    path = str(tmp_path / "r.db")
    settings = Settings(database_path=path, pey_webhook_secret=SECRET)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    conn = connect(path)
    init_db(conn)
    conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES ('b1', 'N', 'C', 'Z')")
    conn.commit()
    with TestClient(application) as client:
        yield client, conn, path
    conn.close()


def add_order(conn, order_id, amount_cents, qr):
    conn.execute(
        "INSERT INTO orders (id, business_id, amount_cents, concept, idempotency_key, codi_qr_id, created_at)"
        " VALUES (?, 'b1', ?, 'x', ?, ?, '2026-11-26T10:00:00-06:00')",
        (order_id, amount_cents, f"k-{order_id}", qr),
    )
    conn.commit()


def send(client, payload, webhook_id="evt-real-1"):
    body = json.dumps(payload)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    headers = {
        "webhook-id": webhook_id,
        "webhook-timestamp": str(int(now.timestamp())),
        "webhook-signature": Webhook(SECRET).sign(webhook_id, now, body),
        "content-type": "application/json",
    }
    return client.post("/api/webhooks/pey", content=body, headers=headers)


def row(conn, sql, *args):
    r = conn.execute(sql, args).fetchone()
    return dict(r) if r else None


def test_marks_order_paid_with_real_flat_pey_payload(api):
    client, conn, _ = api
    add_order(conn, "34567", 15000, "35a13c183a")
    assert send(client, PEY_EXAMPLE).status_code == 200
    o = row(conn, "SELECT * FROM orders WHERE id = '34567'")
    assert o["status"] == "paid" and o["paid_at"] and o["reconciliation_required"] == 0
    p = row(conn, "SELECT * FROM payments WHERE order_id = '34567'")
    assert p["transaction_id"] == "01M3QR8H0RH0XBCKYYD242YXNV"
    assert p["amount_cents"] == 15000 and p["codi_qr_id"] == "35a13c183a"


@pytest.mark.parametrize("amount,cents", [(1, 100), (10.5, 1050), (150, 15000)])
def test_real_payload_amount_in_pesos_converts_to_cents(api, amount, cents):
    client, conn, _ = api
    add_order(conn, "7", cents, "qr-amt")
    payload = {**PEY_EXAMPLE, "amount": amount, "codiQrId": "qr-amt", "numRef": "7"}
    assert send(client, payload).status_code == 200
    assert row(conn, "SELECT status FROM orders WHERE id = '7'")["status"] == "paid"
    assert row(conn, "SELECT amount_cents FROM payments WHERE order_id = '7'")["amount_cents"] == cents


def test_logs_unknown_qr_payment_for_diagnosis(api, caplog):
    client, conn, _ = api
    add_order(conn, "9", 15000, "otro-qr")
    with caplog.at_level(logging.WARNING):
        assert send(client, PEY_EXAMPLE, webhook_id="evt-unknown").status_code == 200
    ev = row(conn, "SELECT * FROM webhook_events WHERE webhook_id = 'evt-unknown'")
    assert ev is not None and ev["event_type"] == "codi.qr.payment_received" and ev["order_id"] is None
    assert row(conn, "SELECT status FROM orders WHERE id = '9'")["status"] == "pending"
    logged = " ".join(r.getMessage() for r in caplog.records)
    assert "codi.qr.payment_received" in logged and "35a13c183a" in logged
    # Sin datos personales en el log.
    assert "customer@example.com" not in logged and "(dev) Order 345" not in logged
