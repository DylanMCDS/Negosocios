from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db import connect
from app.main import create_app
from app.routers.orders import get_pey_client
from app.services.pey import FakePeyClient, PeyRateLimited


@pytest.fixture
def api(tmp_path):
    fake = FakePeyClient()
    settings = Settings(database_path=str(tmp_path / "orders.db"))
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_pey_client] = lambda: fake
    with TestClient(application) as client:
        yield client, fake, settings


def business(client, name="Tacos de Rosa"):
    response = client.post("/api/businesses", json={
        "name": name, "category": "Tacos", "zone": "Tianguis",
    })
    assert response.status_code == 201
    return response.json()


def payload(business_id):
    return {"business_id": business_id, "amount_cents": 1234, "concept": "Dos tacos"}


def test_business_profile_is_persisted_and_public(api):
    client, _, _ = api
    created = business(client)
    assert created == {
        "id": created["id"], "name": "Tacos de Rosa", "category": "Tacos",
        "zone": "Tianguis", "temporary_location": None,
        "location_expires_at": None, "demo_data": False,
    }
    assert created["id"]
    assert client.get(f'/api/businesses/{created["id"]}').json() == created
    assert client.get("/api/businesses/unknown").status_code == 404


def test_creates_order_with_codi_qr_from_pey(api):
    client, fake, settings = api
    receiver = business(client)
    response = client.post("/api/orders", json=payload(receiver["id"]),
                           headers={"Idempotency-Key": "sale-1"})
    assert response.status_code == 201
    order = response.json()
    assert order["status"] == "pending"
    assert order["amount_cents"] == 1234
    assert order["currency"] == "MXN"
    assert order["idempotency_key"] == "sale-1"
    assert order["codi_qr_id"] == "fake-qr-1"
    assert order["qr_string"] == "demo_data:true:fake-qr-1"
    assert order["paid_at"] is None
    assert order["reconciliation_required"] is False
    assert order["reconciliation_reason"] is None
    assert order["demo_data"] is True
    assert (datetime.fromisoformat(order["expires_at"]) -
            datetime.fromisoformat(order["created_at"])).total_seconds() == 600
    assert fake.requests == [{"amount": 12.34, "concept": "Dos tacos",
                              "numRef": order["id"], "expiration": 600}]
    assert order["id"].isdigit() and 1 <= len(order["id"]) <= 7
    detail = client.get(f'/api/orders/{order["id"]}')
    assert detail.status_code == 200
    assert detail.json() == {"order": order, "business": receiver}
    conn = connect(settings.database_path)
    try:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order["id"],)).fetchone()
        assert row["codi_qr_id"] == order["codi_qr_id"]
        assert row["qr_string"] == order["qr_string"]
    finally:
        conn.close()


def test_same_idempotency_key_returns_same_order(api):
    client, fake, _ = api
    body = payload(business(client)["id"])
    first = client.post("/api/orders", json=body, headers={"Idempotency-Key": "retry"})
    second = client.post("/api/orders", json=body, headers={"Idempotency-Key": "retry"})
    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json() == second.json()
    assert len(fake.requests) == 1


def test_concurrent_retries_create_only_one_qr(api):
    client, fake, _ = api
    body = payload(business(client)["id"])
    def submit(_):
        return client.post("/api/orders", json=body, headers={"Idempotency-Key": "parallel"})
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, range(2)))
    assert sorted(r.status_code for r in responses) == [200, 201]
    assert responses[0].json() == responses[1].json()
    assert len(fake.requests) == 1


def test_conflicting_idempotency_payload_is_rejected(api):
    client, fake, _ = api
    body = payload(business(client)["id"])
    first = client.post("/api/orders", json=body, headers={"Idempotency-Key": "same"})
    assert first.status_code == 201
    for field, value in [("amount_cents", 5678), ("concept", "Otro cobro")]:
        response = client.post("/api/orders", json={**body, field: value},
                               headers={"Idempotency-Key": "same"})
        assert response.status_code == 409
    assert len(fake.requests) == 1


def test_idempotency_keys_are_scoped_to_business(api):
    client, fake, _ = api
    ids = [business(client, name)["id"] for name in ["Rosa", "Juan"]]
    responses = [client.post("/api/orders", json=payload(identifier),
                            headers={"Idempotency-Key": "shared"}) for identifier in ids]
    assert [r.status_code for r in responses] == [201, 201]
    assert responses[0].json()["id"] != responses[1].json()["id"]
    assert len(fake.requests) == 2


@pytest.mark.parametrize("amount", [0, -1, 1.5, True])
def test_rejects_zero_or_negative_amount(api, amount):
    client, fake, _ = api
    body = {**payload(business(client)["id"]), "amount_cents": amount}
    assert client.post("/api/orders", json=body,
                       headers={"Idempotency-Key": "bad"}).status_code == 422
    assert fake.requests == []


def test_does_not_create_order_when_pey_fails(api):
    client, fake, settings = api
    class UnavailablePey(FakePeyClient):
        def create_qr(self, *args):
            raise PeyRateLimited("CALL_LIMIT_REACHED", status_code=429)
    client.app.dependency_overrides[get_pey_client] = UnavailablePey
    body = payload(business(client)["id"])
    response = client.post("/api/orders", json=body, headers={"Idempotency-Key": "failure"})
    assert response.status_code == 502
    assert isinstance(response.json()["detail"], str)
    conn = connect(settings.database_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 0
    finally:
        conn.close()
    client.app.dependency_overrides[get_pey_client] = lambda: fake
    assert client.post("/api/orders", json=body,
                       headers={"Idempotency-Key": "failure"}).status_code == 201


def test_returns_404_for_unknown_order(api):
    client, _, _ = api
    assert client.get("/api/orders/unknown").status_code == 404


def test_requires_existing_business_and_idempotency_header(api):
    client, fake, _ = api
    assert client.post("/api/orders", json=payload("unknown"),
                       headers={"Idempotency-Key": "unknown"}).status_code == 404
    body = payload(business(client)["id"])
    assert client.post("/api/orders", json=body).status_code == 422
    assert client.post("/api/orders", json=body,
                       headers={"Idempotency-Key": ""}).status_code == 422
    assert fake.requests == []
