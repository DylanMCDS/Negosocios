from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app

# 100 MXN price, 60 cost, 30 minimum contribution -> maximum discount 10 %.
ECONOMICS = {"price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000}


@pytest.fixture
def api(tmp_path):
    path = str(tmp_path / "alliances.db")
    settings = Settings(database_path=path)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    conn = connect(path)
    init_db(conn)
    for bid in ("taqueria", "cafe"):
        conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES (?, ?, 'Comida', 'Centro')", (bid, bid))
    conn.commit()
    with TestClient(application) as client:
        yield client, conn
    conn.close()


def propose(client, discount_pct=10, budget_cents=10000, max_uses=5):
    return client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "taqueria",
        "discount_pct": discount_pct, "budget_cents": budget_cents, "max_uses": max_uses, **ECONOMICS,
    })


def active(client, **kwargs):
    alliance = propose(client, **kwargs).json()
    assert client.post(f"/api/alliances/{alliance['id']}/accept").status_code == 200
    return alliance


def test_alliance_discount_cannot_exceed_max_discount(api):
    client, _ = api
    ok = propose(client, discount_pct=10)
    assert ok.status_code == 201 and ok.json()["status"] == "proposal" and ok.json()["referral_code"]
    too_much = propose(client, discount_pct=10.01)
    assert too_much.status_code == 422
    detail = too_much.json()["detail"]
    assert detail["max_discount_pct"] == 10.0 and "10.01" in detail["message"]
    # No margin at all: the maximum is not a discount, the alliance cannot exist.
    assert client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "taqueria", "discount_pct": 1,
        "budget_cents": 1000, "max_uses": 1, "price_cents": 10000, "variable_cost_cents": 8000, "min_contribution_cents": 3000,
    }).status_code == 422


def test_quote_respects_budget_and_uses(api):
    client, _ = api
    alliance = active(client, budget_cents=1500, max_uses=5)  # 10 % of 100 MXN = 10 MXN per use: one fits
    url = f"/api/alliances/{alliance['id']}/quote"
    first = client.post(url, json={"amount_cents": 10000, "order_id": "o1"}).json()
    assert first == {**first, "applied": True, "original_cents": 10000, "discount_cents": 1000, "total_cents": 9000, "budget_remaining_cents": 500, "uses_remaining": 4}
    second = client.post(url, json={"amount_cents": 10000, "order_id": "o2"}).json()
    assert second["applied"] is False and second["discount_cents"] == 0 and second["total_cents"] == 10000
    assert second["budget_remaining_cents"] == 500 and "presupuesto" in second["reason"]
    uses = active(client, budget_cents=100000, max_uses=1)
    url2 = f"/api/alliances/{uses['id']}/quote"
    assert client.post(url2, json={"amount_cents": 10000, "order_id": "u1"}).json()["applied"] is True
    out = client.post(url2, json={"amount_cents": 10000, "order_id": "u2"}).json()
    assert out["applied"] is False and "usos" in out["reason"]
    # An alliance that was only proposed gives no discount.
    pending = propose(client).json()
    assert client.post(f"/api/alliances/{pending['id']}/quote", json={"amount_cents": 10000, "order_id": "p1"}).status_code == 409


def test_benefit_applies_once_per_order(api):
    client, _ = api
    alliance = active(client, budget_cents=100000, max_uses=3)
    url = f"/api/alliances/{alliance['id']}/quote"
    body = {"amount_cents": 10000, "order_id": "same-order"}
    first = client.post(url, json=body).json()
    again = client.post(url, json=body).json()
    assert first == again and first["uses_remaining"] == 2 and first["budget_remaining_cents"] == 99000
    metrics = client.get(f"/api/alliances/{alliance['id']}/metrics").json()
    assert metrics["referrals"] == 1 and metrics["benefit_cost_cents"] == 1000

    def quote(i):
        return client.post(f"/api/alliances/{alliance['id']}/quote", json={"amount_cents": 10000, "order_id": f"race-{i}"}).json()

    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(quote, range(8)))
    assert sum(r["applied"] for r in results) == 2  # 3 uses in total, one already taken
    assert client.get(f"/api/alliances/{alliance['id']}/metrics").json()["referrals"] == 3


def test_metrics_count_paid_attributed_purchases(api):
    client, conn = api
    alliance = active(client, budget_cents=100000, max_uses=5)
    url = f"/api/alliances/{alliance['id']}/quote"
    for ref in ("A", "B"):
        client.post(url, json={"amount_cents": 10000, "order_id": ref})
    conn.execute("INSERT INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, created_at, paid_at)"
                 " VALUES ('9001', 'taqueria', 9000, 'x', 'paid', 'A', '2026-11-26T10:00:00-06:00', '2026-11-26T10:01:00-06:00')")
    conn.commit()
    metrics = client.get(f"/api/alliances/{alliance['id']}/metrics").json()
    assert metrics["referrals"] == 2 and metrics["paid_purchases"] == 1
    assert metrics["benefit_cost_cents"] == 2000 and metrics["estimated_contribution_cents"] == 9000 - 6000
    assert "correlación" in metrics["note"] and "causalidad" in metrics["note"]
