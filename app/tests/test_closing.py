from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app

MX = ZoneInfo("America/Mexico_City")


@pytest.fixture
def env(tmp_path, monkeypatch):
    path = tmp_path / "t.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    conn = connect(path)
    init_db(conn)
    conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES ('b1', 'N', 'C', 'Z')")
    conn.commit()
    yield TestClient(create_app(web_dist=None)), conn
    conn.close()


def _order(conn, oid, status, cents, when):
    iso = when.isoformat()
    conn.execute(
        "INSERT INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, created_at, paid_at)"
        " VALUES (?, 'b1', ?, 'x', ?, ?, ?, ?)",
        (oid, cents, status, oid, iso, iso if status == "paid" else None),
    )
    conn.commit()


def test_records_manual_expense(env):
    client, conn = env
    body = {"business_id": "b1", "amount_cents": 35000, "category": "Insumos", "date": "2026-11-26"}
    r = client.post("/api/expenses", json=body)
    assert r.status_code == 201
    out = r.json()
    assert out["id"] and out["source"] == "manual" and out["currency"] == "MXN" and out["demo_data"] is False
    assert conn.execute("SELECT amount_cents FROM expenses WHERE id = ?", (out["id"],)).fetchone()[0] == 35000
    body["business_id"] = "nope"
    assert client.post("/api/expenses", json=body).status_code == 404


def test_closing_today_includes_paid_sales_and_expenses(env):
    client, conn = env
    now = datetime.now(MX)
    _order(conn, "o1", "paid", 10000, now)
    _order(conn, "o2", "paid", 5000, now)
    _order(conn, "old", "paid", 99900, now - timedelta(days=2))
    client.post("/api/expenses", json={"business_id": "b1", "amount_cents": 4000, "category": "Insumos", "date": now.date().isoformat()})
    client.post("/api/expenses", json={"business_id": "b1", "amount_cents": 77700, "category": "Renta", "date": (now - timedelta(days=2)).date().isoformat()})
    r = client.get("/api/closing/today", params={"business_id": "b1"})
    assert r.status_code == 200
    assert r.json() == {
        "currency": "MXN", "confirmed_sales_cents": 15000, "expenses_cents": 4000,
        "estimated_profit_cents": 11000, "pending": [], "pending_cents": 0, "missing": [],
    }
    assert client.get("/api/closing/today", params={"business_id": "zzz"}).status_code == 404
    assert client.get("/api/closing/today").status_code == 422


def test_closing_today_excludes_pending_orders(env):
    client, conn = env
    now = datetime.now(MX)
    _order(conn, "p1", "pending", 7000, now)
    out = client.get("/api/closing/today", params={"business_id": "b1"}).json()
    assert out["confirmed_sales_cents"] == 0
    assert out["pending_cents"] == 7000 and [o["id"] for o in out["pending"]] == ["p1"]
    assert out["missing"] == ["sales", "expenses"]


def test_simulate_campaign_returns_max_discount_and_uses(env):
    client, _ = env
    body = {"price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000, "budget_cents": 10000}
    out = client.post("/api/campaigns/simulate", json=body).json()
    assert out["ok"] is True and out["max_discount_pct"] == 10.0
    assert out["max_uses"] == 10 and out["budget_cents"] == 10000 and out["currency"] == "MXN"
    assert "price_cents" in out["formula"]
    bad = client.post("/api/campaigns/simulate", json={**body, "min_contribution_cents": 5000}).json()
    assert bad["ok"] is False and bad["max_discount_pct"] is None and bad["max_uses"] is None and bad["message"]


def test_seed_loads_demo_day(env):
    client, conn = env
    for _ in range(2):  # idempotent
        r = client.post("/api/demo/seed")
        assert r.status_code == 200 and r.json() == {"demo_data": True, "business_id": "rosa"}
    count = lambda t: conn.execute(f"SELECT COUNT(*) FROM {t} WHERE demo_data = 1").fetchone()[0]
    assert (count("businesses"), count("orders"), count("payments"), count("expenses")) == (1, 3, 2, 2)
    assert conn.execute("SELECT COUNT(*) FROM webhook_events").fetchone()[0] == 2
