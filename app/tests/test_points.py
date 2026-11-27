from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.routers.points import get_now

NOW = datetime(2026, 11, 27, 18, tzinfo=UTC)
BUSINESS = "points-fixture"


@pytest.fixture
def api(tmp_path, monkeypatch):
    path = str(tmp_path / "points.db")
    monkeypatch.setenv("DATABASE_PATH", path)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_now] = lambda: NOW
    with TestClient(application) as client:
        conn = connect(path)
        init_db(conn)
        conn.execute("INSERT INTO businesses(id,name,category,zone,demo_data) VALUES (?,?,?,?,1)",
                     (BUSINESS, "Tacos del Mercado", "Tacos", "Pasillo 2"))
        conn.commit()
        conn.close()
        yield client, path


def point(client, kind="cashier", label="Caja principal"):
    response = client.post("/api/points", json={"business_id": BUSINESS, "kind": kind, "label": label})
    assert response.status_code == 201
    return response.json()


def order(path, identifier, *, business_id=BUSINESS, status="pending", expires=None, minutes_ago=0):
    conn = connect(path)
    conn.execute("""INSERT INTO orders(id,business_id,amount_cents,concept,status,idempotency_key,
        codi_qr_id,qr_string,created_at,expires_at,demo_data) VALUES (?,?,?,?,?,?,?,?,?,?,1)""",
        (identifier, business_id, 3550, f"Cuenta {identifier}", status, identifier,
         f"offline-{identifier}", "demo_data:true:offline", (NOW - timedelta(minutes=minutes_ago)).isoformat(),
         expires or (NOW + timedelta(minutes=10)).isoformat()))
    conn.commit()
    conn.close()


def link(client, token, identifier):
    response = client.post(f"/api/points/{token}/orders", json={"order_id": identifier})
    assert response.status_code == 200


def test_entrance_point_opens_profile(api):
    client, _ = api
    created = point(client, "entrance", "Entrada del puesto")
    response = client.get(created["path"], follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == f"/?{urlencode({'negocio': BUSINESS})}#negocio"
    assert response.headers["cache-control"] == "no-store"
    resolved = client.get(f'/api/points/{created["id"]}/resolve')
    assert resolved.status_code == 200
    assert resolved.json()["mode"] == "profile"
    assert resolved.json()["business"]["name"] == "Tacos del Mercado"
    assert resolved.headers["cache-control"] == "no-store"


def test_cashier_point_opens_latest_pending_order(api):
    client, path = api
    created = point(client)
    order(path, "old", minutes_ago=2)
    order(path, "latest")
    order(path, "other-point")
    link(client, created["id"], "old")
    link(client, created["id"], "latest")
    conn = connect(path)
    conn.execute("UPDATE orders SET status='paid' WHERE id='old'")
    conn.commit()
    conn.close()
    response = client.get(created["path"], follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/pagar/latest"
    resolved = client.get(f'/api/points/{created["id"]}/resolve').json()
    assert resolved["mode"] == "payment"
    assert [item["id"] for item in resolved["orders"]] == ["latest"]
    assert resolved["business"]["id"] == BUSINESS


def test_revoked_point_is_rejected(api):
    client, path = api
    created = point(client)
    order(path, "unpaid")
    link(client, created["id"], "unpaid")
    for _ in range(2):
        response = client.delete(f'/api/points/{created["id"]}')
        assert response.status_code == 200
        assert response.json()["active"] is False
    resolved = client.get(f'/api/points/{created["id"]}/resolve')
    assert resolved.status_code == 410
    assert resolved.json()["detail"] == "Este punto ya no está activo"
    assert resolved.headers["cache-control"] == "no-store"
    assert client.get(created["path"], follow_redirects=False).headers["location"] == f'/#puntos/{created["id"]}'
    conn = connect(path)
    try:
        assert conn.execute("SELECT status FROM orders WHERE id='unpaid'").fetchone()[0] == "pending"
    finally:
        conn.close()


def test_two_pending_orders_ask_to_choose(api):
    client, path = api
    created = point(client)
    order(path, "one", minutes_ago=1)
    order(path, "two")
    for identifier in ["one", "two", "two"]:
        link(client, created["id"], identifier)
    resolved = client.get(f'/api/points/{created["id"]}/resolve').json()
    assert resolved["mode"] == "choose"
    assert [item["id"] for item in resolved["orders"]] == ["two", "one"]
    assert [item["url"] for item in resolved["orders"]] == ["/pagar/two", "/pagar/one"]
    assert client.get(created["path"], follow_redirects=False).headers["location"] == f'/#puntos/{created["id"]}'


def test_empty_and_table_points_do_not_invent_a_charge(api):
    client, path = api
    created = point(client, "table", "Mesa 3")
    assert client.get(f'/api/points/{created["id"]}/resolve').json()["mode"] == "empty"
    order(path, "table-bill")
    link(client, created["id"], "table-bill")
    assert client.get(created["path"], follow_redirects=False).headers["location"] == "/pagar/table-bill"


def test_paid_expired_or_foreign_orders_cannot_be_linked(api):
    client, path = api
    created = point(client)
    order(path, "expired", expires=(NOW - timedelta(seconds=1)).isoformat())
    order(path, "paid", status="paid")
    order(path, "foreign", business_id="rosa")
    for identifier in ["expired", "paid", "foreign"]:
        response = client.post(f'/api/points/{created["id"]}/orders', json={"order_id": identifier})
        assert response.status_code in (404, 409)
    assert client.get(f'/api/points/{created["id"]}/resolve').json()["mode"] == "empty"


def test_linked_order_stops_resolving_when_it_expires(api):
    client, path = api
    created = point(client)
    order(path, "soon")
    link(client, created["id"], "soon")
    client.app.dependency_overrides[get_now] = lambda: NOW + timedelta(minutes=10)
    assert client.get(f'/api/points/{created["id"]}/resolve').json()["mode"] == "empty"


def test_identifiers_are_random_and_validation_is_strict(api):
    client, _ = api
    first, second = point(client), point(client)
    assert first["id"] != second["id"]
    assert len(first["id"]) >= 24
    assert client.get("/api/points/missing/resolve").status_code == 404
    assert client.post("/api/points", json={"business_id": "missing", "kind": "entrance", "label": "Entrada"}).status_code == 404
    assert client.post("/api/points", json={"business_id": BUSINESS, "kind": "invalid", "label": "Caja"}).status_code == 422
    assert client.post("/api/points", json={"business_id": BUSINESS, "kind": "table", "label": "  "}).status_code == 422
    listed = client.get("/api/points", params={"business_id": BUSINESS})
    assert listed.status_code == 200
    assert {p["id"] for p in listed.json()["points"]} == {first["id"], second["id"]}
