import base64
import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from standardwebhooks import Webhook

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app

SECRET = "whsec_" + base64.b64encode(b"offline-test-signing-material").decode()


@pytest.fixture
def api(tmp_path):
    path = str(tmp_path / "w.db")
    settings = Settings(database_path=path, pey_webhook_secret=SECRET)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    conn = connect(path)
    init_db(conn)
    conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES ('b1', 'N', 'C', 'Z')")
    conn.execute(
        "INSERT INTO orders (id, business_id, amount_cents, concept, idempotency_key, codi_qr_id, created_at)"
        " VALUES ('1234', 'b1', 1050, 'x', 'k1', 'qr-1', '2026-11-26T10:00:00-06:00')")
    conn.commit()
    with TestClient(application) as client:
        yield client, conn
    conn.close()


def post(client, webhook_id="evt-1", amount=10.5, qr="qr-1", secret=SECRET, kind="codi.qr.payment_received"):
    body = json.dumps({"type": kind, "data": {
        "amount": amount, "codiQrId": qr, "numRef": "1234", "transactionId": f"tx-{webhook_id}"}})
    now = datetime.now(timezone.utc).replace(microsecond=0)
    headers = {
        "webhook-id": webhook_id, "webhook-timestamp": str(int(now.timestamp())),
        "webhook-signature": Webhook(secret).sign(webhook_id, now, body),
        "content-type": "application/json",
    }
    return client.post("/api/webhooks/pey", content=body, headers=headers)


def order(conn):
    return dict(conn.execute("SELECT * FROM orders WHERE id = '1234'").fetchone())


def count(conn, table):
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_marks_order_paid_on_valid_qr_webhook(api):
    client, conn = api
    r = post(client)
    assert r.status_code == 200 and r.json() == {"ok": True}
    o = order(conn)
    assert o["status"] == "paid" and o["paid_at"] and o["reconciliation_required"] == 0
    p = dict(conn.execute("SELECT * FROM payments").fetchone())
    assert (p["order_id"], p["transaction_id"], p["amount_cents"], p["webhook_id"]) == ("1234", "tx-evt-1", 1050, "evt-1")


def test_rejects_webhook_with_bad_signature(api):
    client, conn = api
    other = "whsec_" + base64.b64encode(b"another-secret-material-here").decode()
    assert post(client, secret=other).status_code == 401
    assert order(conn)["status"] == "pending"
    assert (count(conn, "payments"), count(conn, "webhook_events")) == (0, 0)


def test_duplicate_webhook_id_is_processed_once(api):
    client, conn = api
    assert post(client).status_code == 200
    assert post(client).json() == {"ok": True}
    assert (count(conn, "payments"), count(conn, "webhook_events")) == (1, 1)


def test_ignores_payment_for_unknown_qr(api):
    client, conn = api
    assert post(client, qr="nope").status_code == 200
    assert order(conn)["status"] == "pending"
    assert (count(conn, "payments"), count(conn, "webhook_events")) == (0, 1)


def test_amount_mismatch_is_flagged_not_paid(api):
    client, conn = api
    assert post(client, amount=9.99).status_code == 200
    o = order(conn)
    assert o["status"] == "pending" and o["paid_at"] is None
    assert o["reconciliation_required"] == 1 and o["reconciliation_reason"]
    assert count(conn, "payments") == 0 and count(conn, "webhook_events") == 1
