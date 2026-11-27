import base64
import json
import sqlite3
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from standardwebhooks import Webhook

from app.config import Settings, get_settings
from app.main import create_app
from app.routers.orders import get_pey_client
from app.services.pey import FakePeyClient

SECRET = "whsec_" + base64.b64encode(b"offline-test-signing-material").decode()


@pytest.fixture
def api(tmp_path):
    fake = FakePeyClient()
    settings = Settings(database_path=str(tmp_path / "s.db"), pey_webhook_secret=SECRET)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: fake
    with TestClient(application) as client:
        biz = client.post("/api/businesses", json={"name": "Tacos", "category": "Tacos", "zone": "Z"}).json()["id"]
        yield client, fake, settings, biz


def make_order(client, biz, cents=10001, key="k1"):
    r = client.post(
        "/api/orders", headers={"Idempotency-Key": key},
        json={"business_id": biz, "amount_cents": cents, "concept": "Cena"},
    )
    assert r.status_code == 201, r.text
    return r.json()


def pay(client, qr, cents, webhook_id):
    body = json.dumps({"type": "codi.qr.payment_received", "amount": cents / 100, "codiQrId": qr,
                       "transactionId": f"tx-{webhook_id}"})
    now = datetime.now(UTC).replace(microsecond=0)
    headers = {
        "webhook-id": webhook_id, "webhook-timestamp": str(int(now.timestamp())),
        "webhook-signature": Webhook(SECRET).sign(webhook_id, now, body), "content-type": "application/json",
    }
    return client.post("/api/webhooks/pey", content=body, headers=headers)


def status(client, order_id):
    return client.get(f"/api/orders/{order_id}").json()["order"]


def db(settings):
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def test_splits_order_into_equal_parts_with_remainder(api):
    client, fake, _, biz = api
    order = make_order(client, biz, 10001)
    r = client.post(f"/api/orders/{order['id']}/split", json={"parts": 3})
    assert r.status_code == 201, r.text
    parts = r.json()["parts"]
    assert [p["amount_cents"] for p in parts] == [3335, 3333, 3333]  # the leftover cents go to the first part
    assert sum(p["amount_cents"] for p in parts) == 10001
    assert all(p["status"] == "pending" and p["qr_string"] and p["codi_qr_id"] for p in parts)
    assert len({p["codi_qr_id"] for p in parts}) == 3
    assert len(fake.requests) == 1 + 3  # the order's own QR plus one per part
    assert {r_["numRef"] for r_ in fake.requests[1:]}.isdisjoint({order["id"]})
    assert all(r_["numRef"].isdigit() and len(r_["numRef"]) <= 7 for r_ in fake.requests[1:])
    again = client.get(f"/api/orders/{order['id']}/split").json()
    assert again["paid_cents"] == 0 and again["total_cents"] == 10001 and again["missing"] == [1, 2, 3]
    # explicit amounts
    other = make_order(client, biz, 5000, "k2")
    ok = client.post(f"/api/orders/{other['id']}/split", json={"amounts_cents": [1000, 4000]})
    assert ok.status_code == 201 and [p["amount_cents"] for p in ok.json()["parts"]] == [1000, 4000]
    third = make_order(client, biz, 5000, "k3")
    assert client.post(f"/api/orders/{third['id']}/split", json={"amounts_cents": [1000, 3000]}).status_code == 422
    assert client.post(f"/api/orders/{third['id']}/split", json={"parts": 1}).status_code == 422
    assert client.post(f"/api/orders/{third['id']}/split", json={"parts": 2, "amounts_cents": [2500, 2500]}).status_code == 422
    assert client.post("/api/orders/9999999/split", json={"parts": 2}).status_code == 404
    assert client.post(f"/api/orders/{order['id']}/split", json={"parts": 2}).status_code == 409  # already split


def test_order_paid_only_when_all_parts_paid(api):
    client, _, settings, biz = api
    order = make_order(client, biz, 10001)
    parts = client.post(f"/api/orders/{order['id']}/split", json={"parts": 3}).json()["parts"]
    assert pay(client, parts[0]["codi_qr_id"], parts[0]["amount_cents"], "e1").status_code == 200
    assert status(client, order["id"])["status"] == "pending"
    mid = client.get(f"/api/orders/{order['id']}/split").json()
    assert mid["missing"] == [2, 3] and mid["paid_cents"] == 3335
    pay(client, parts[1]["codi_qr_id"], parts[1]["amount_cents"], "e2")
    assert status(client, order["id"])["status"] == "pending"
    pay(client, parts[2]["codi_qr_id"], parts[2]["amount_cents"], "e3")
    final = status(client, order["id"])
    assert final["status"] == "paid" and final["paid_at"]
    assert client.get(f"/api/orders/{order['id']}/split").json()["missing"] == []
    conn = db(settings)
    rows = conn.execute("SELECT order_id, amount_cents FROM payments ORDER BY amount_cents").fetchall()
    assert [(r["order_id"], r["amount_cents"]) for r in rows] == [(order["id"], 3333)] * 2 + [(order["id"], 3335)]
    conn.close()


def test_part_webhook_is_idempotent(api):
    client, _, settings, biz = api
    order = make_order(client, biz, 10001)
    parts = client.post(f"/api/orders/{order['id']}/split", json={"parts": 2}).json()["parts"]
    first = parts[0]
    assert pay(client, first["codi_qr_id"], first["amount_cents"], "dup").status_code == 200
    assert pay(client, first["codi_qr_id"], first["amount_cents"], "dup").status_code == 200  # same webhook-id
    conn = db(settings)
    assert conn.execute("SELECT COUNT(*) FROM payments").fetchone()[0] == 1
    assert status(client, order["id"])["status"] == "pending"
    # a second, different webhook for an already paid part is flagged, never counted twice
    pay(client, first["codi_qr_id"], first["amount_cents"], "other")
    assert conn.execute("SELECT COUNT(*) FROM payments").fetchone()[0] == 1
    flagged = status(client, order["id"])
    assert flagged["reconciliation_required"] is True and "parte" in flagged["reconciliation_reason"]
    assert status(client, order["id"])["status"] == "pending"
    conn.close()


def test_wrong_amount_or_full_qr_on_a_split_order_is_flagged_not_paid(api):
    client, _, _, biz = api
    order = make_order(client, biz, 10001)
    parts = client.post(f"/api/orders/{order['id']}/split", json={"parts": 2}).json()["parts"]
    pay(client, parts[0]["codi_qr_id"], 1, "bad-amount")
    o = status(client, order["id"])
    assert o["status"] == "pending" and o["reconciliation_required"] is True
    assert client.get(f"/api/orders/{order['id']}/split").json()["missing"] == [1, 2]
    pay(client, order["codi_qr_id"], 10001, "full")  # the original QR must not mark a split order paid
    assert status(client, order["id"])["status"] == "pending"


class RecordingPey:
    """Fake pey that can send bankAccountId and records what each QR was asked for."""

    def __init__(self):
        self.calls = []

    def create_qr(self, amount_mxn, concept, num_ref, expiration_s, bank_account_id=None):
        from app.services.pey import QrResult

        self.calls.append({"bank_account_id": bank_account_id, "amount": amount_mxn})
        return QrResult(f"rq-{len(self.calls)}", f"demo_data:true:rq-{len(self.calls)}")


BBVA = "012180015678901230"  # valid CLABE


def _api_with(fake, tmp_path, name):
    settings = Settings(database_path=str(tmp_path / name), pey_webhook_secret=SECRET)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: fake
    return application, settings


def test_split_sends_the_business_bank_account_id_like_a_normal_charge(tmp_path):
    fake = RecordingPey()
    application, _ = _api_with(fake, tmp_path, "real.db")
    with TestClient(application) as client:
        biz = client.post("/api/businesses", json={"name": "N", "category": "C", "zone": "Z"}).json()["id"]
        assert client.put(f"/api/businesses/{biz}/payout-account", json={"clabe": BBVA, "mode": "pey", "pey_bank_account_id": "ba-7"}).status_code == 200
        order = make_order(client, biz, 10001)
        assert client.post(f"/api/orders/{order['id']}/split", json={"parts": 2}).status_code == 201
    assert [c["bank_account_id"] for c in fake.calls] == ["ba-7", "ba-7", "ba-7"]  # the order's own QR plus both parts


def test_split_never_charges_a_real_account_with_a_client_that_cannot_send_it(tmp_path):
    fake = FakePeyClient()  # today's client: no bank_account_id parameter
    application, settings = _api_with(fake, tmp_path, "legacy.db")
    with TestClient(application) as client:
        biz = client.post("/api/businesses", json={"name": "N", "category": "C", "zone": "Z"}).json()["id"]
        order = make_order(client, biz, 10001)
        conn = sqlite3.connect(settings.database_path)
        conn.execute("INSERT INTO payout_accounts (business_id, bank, last4, mode, pey_bank_account_id, updated_at) VALUES (?, 'BBVA', '1230', 'pey', 'ba-9', 'x')", (biz,))
        conn.commit()
        conn.close()
        before = len(fake.requests)
        r = client.post(f"/api/orders/{order['id']}/split", json={"parts": 2})
        assert r.status_code == 503 and "cobro directo" in r.text.lower()
        assert len(fake.requests) == before  # no part QR was created on the platform account
        assert client.get(f"/api/orders/{order['id']}/split").status_code == 404


def test_split_retires_the_full_qr_so_nobody_is_asked_to_pay_it(api):
    client, _, _, biz = api
    order = make_order(client, biz, 10001)
    assert client.get(f"/api/orders/{order['id']}").json()["order"]["qr_string"]  # payable before the split
    client.post(f"/api/orders/{order['id']}/split", json={"parts": 2})
    after = client.get(f"/api/orders/{order['id']}").json()["order"]
    assert after["qr_string"] is None and after["status"] == "pending"
    pay(client, order["codi_qr_id"], 10001, "late-full")  # a payment from a QR shown before the split
    flagged = status(client, order["id"])
    assert flagged["status"] == "pending" and flagged["reconciliation_required"] is True
