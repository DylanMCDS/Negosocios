import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app
from app.routers.orders import get_pey_client
from app.services.pey import QrResult

BANAMEX = "002010077777777771"  # valid CLABE (check digit 1)
BBVA = "012180015678901230"  # valid CLABE (check digit 0)


class RecordingPey:
    """Fake pey that records whether a bankAccountId was requested."""

    def __init__(self):
        self.calls = []

    def create_qr(self, amount_mxn, concept, num_ref, expiration_s, bank_account_id=None):
        self.calls.append({"bank_account_id": bank_account_id, "amount": amount_mxn})
        return QrResult(f"qr-{len(self.calls)}", f"demo_data:true:qr-{len(self.calls)}")


@pytest.fixture
def api(tmp_path):
    fake = RecordingPey()
    settings = Settings(database_path=str(tmp_path / "payout.db"))
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: fake
    with TestClient(application) as client:
        biz = client.post("/api/businesses", json={"name": "Tacos de Rosa", "category": "Tacos", "zone": "Tianguis"})
        assert biz.status_code == 201
        yield client, fake, settings, biz.json()["id"]


def put(client, business_id, **body):
    return client.put(f"/api/businesses/{business_id}/payout-account", json=body)


def order(client, business_id, key="k1"):
    r = client.post(
        "/api/orders", headers={"Idempotency-Key": key},
        json={"business_id": business_id, "amount_cents": 10000, "concept": "Orden de tacos"},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_rejects_clabe_with_wrong_check_digit(api):
    client, _, _, bid = api
    bad = BANAMEX[:-1] + "2"
    r = put(client, bid, clabe=bad)
    assert r.status_code == 422
    assert "dígito de control" in r.text
    assert client.get(f"/api/businesses/{bid}/payout-account").status_code == 404  # nothing saved
    for short in ("12345", BANAMEX + "0", "00201007777777777A"):
        assert put(client, bid, clabe=short).status_code == 422
    assert put(client, bid, clabe=BANAMEX).status_code == 200
    assert put(client, "nadie", clabe=BANAMEX).status_code == 404


def test_stores_only_bank_and_last_four(api):
    client, _, settings, bid = api
    r = put(client, bid, clabe=BANAMEX)
    assert r.status_code == 200
    body = r.json()
    assert body["bank"] == "Banamex" and body["last4"] == "7771" and body["mode"] == "simulated"
    assert BANAMEX not in r.text and "clabe" not in body
    conn = sqlite3.connect(settings.database_path)
    rows = conn.execute("SELECT * FROM payout_accounts").fetchall()
    dump = repr(rows) + repr(conn.execute("SELECT sql FROM sqlite_master WHERE name = 'payout_accounts'").fetchall())
    conn.close()
    assert len(rows) == 1
    assert BANAMEX not in dump and BANAMEX[:14] not in dump  # no full CLABE, no long prefix
    assert BANAMEX not in client.get(f"/api/businesses/{bid}/payout-account").text


def test_order_uses_pey_bank_account_id_when_real(api):
    client, fake, _, bid = api
    assert put(client, bid, clabe=BBVA, mode="pey").status_code == 422  # real mode needs pey's id
    assert put(client, bid, clabe=BBVA, mode="pey", pey_bank_account_id="ba-123").status_code == 200
    created = order(client, bid)
    assert fake.calls[-1]["bank_account_id"] == "ba-123"
    assert client.get(f"/api/orders/{created['id']}/settlement").json()["settlement"] == "directa"


def test_order_marks_settlement_simulated_without_real_account(api):
    client, fake, _, bid = api
    first = order(client, bid, "k1")  # no account at all
    assert fake.calls[-1]["bank_account_id"] is None
    got = client.get(f"/api/orders/{first['id']}/settlement").json()
    assert got["settlement"] == "simulada" and "liquidación pendiente al negocio" in got["note"]
    assert put(client, bid, clabe=BANAMEX).status_code == 200  # simulated account
    second = order(client, bid, "k2")
    assert fake.calls[-1]["bank_account_id"] is None
    assert client.get(f"/api/orders/{second['id']}/settlement").json()["settlement"] == "simulada"
    assert client.get("/api/orders/9999999/settlement").status_code == 404


def test_pey_mode_is_rejected_while_the_client_cannot_send_bank_account_id(tmp_path):
    from app.services.pey import (
        FakePeyClient,  # today's client: no bank_account_id parameter
    )

    settings = Settings(database_path=str(tmp_path / "nopey.db"))
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: FakePeyClient()
    with TestClient(application) as client:
        bid = client.post("/api/businesses", json={"name": "N", "category": "C", "zone": "Z"}).json()["id"]
        r = put(client, bid, clabe=BBVA, mode="pey", pey_bank_account_id="ba-1")
        assert r.status_code == 422 and "cobro directo" in r.text.lower()
        assert client.get(f"/api/businesses/{bid}/payout-account").status_code == 404  # nothing saved
        assert put(client, bid, clabe=BBVA).status_code == 200  # simulated still fine
        assert order(client, bid)["business_id"] == bid


def test_existing_pey_account_never_crashes_a_charge_when_the_client_cannot_send_it(tmp_path):
    from app.services.pey import FakePeyClient

    settings = Settings(database_path=str(tmp_path / "legacy.db"))
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: FakePeyClient()
    with TestClient(application) as client:
        bid = client.post("/api/businesses", json={"name": "N", "category": "C", "zone": "Z"}).json()["id"]
        put(client, bid, clabe=BBVA)  # creates the tables
        conn = sqlite3.connect(settings.database_path)
        conn.execute("UPDATE payout_accounts SET mode = 'pey', pey_bank_account_id = 'ba-9' WHERE business_id = ?", (bid,))
        conn.commit()
        conn.close()
        r = client.post(
            "/api/orders", headers={"Idempotency-Key": "k9"},
            json={"business_id": bid, "amount_cents": 10000, "concept": "Orden"},
        )
        assert r.status_code == 503 and "cobro directo" in r.text.lower()
        assert "ba-9" not in r.text
