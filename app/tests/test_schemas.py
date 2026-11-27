import json
import sqlite3
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.db import connect, init_db
from app.schemas import Business, Expense, Order, OrderCreate, Payment


def test_order_create_rejects_zero_or_negative_amount():
    for amount in (0, -1, 1.5, True, "100"):
        with pytest.raises(ValidationError):
            OrderCreate(business_id="rosa", amount_cents=amount, concept="Tacos")
    order = OrderCreate(business_id="rosa", amount_cents=10000, concept="Tacos")
    assert order.amount_cents == 10000
    assert order.currency == "MXN"
    with pytest.raises(ValidationError):
        OrderCreate(business_id="rosa", amount_cents=10000, concept="Tacos", currency="USD")


def test_concept_longer_than_40_chars_is_rejected():
    with pytest.raises(ValidationError):
        OrderCreate(business_id="rosa", amount_cents=10000, concept="x" * 41)
    assert len(OrderCreate(business_id="rosa", amount_cents=1, concept="x" * 40).concept) == 40


def test_demo_fixture_validates_against_schemas():
    data = json.loads((Path(__file__).parents[1] / "fixtures/demo_day.json").read_text())
    assert data.get("demo_data") is True
    business = Business.model_validate(data["business"])
    assert business.name == "Tacos de Doña Rosa"
    assert data["unit_economics"] == {"price_cents": 10000, "variable_cost_cents": 6000, "currency": "MXN"}
    orders = [Order.model_validate(row) for row in data["orders"]]
    expenses = [Expense.model_validate(row) for row in data["expenses"]]
    payments = [Payment.model_validate(row) for row in data["payments"]]
    assert {order.status for order in orders} == {"paid", "pending"}
    assert expenses and payments
    assert all(row.business_id == business.id for row in orders + expenses)
    paid = {order.id: order for order in orders if order.status == "paid"}
    assert all(payment.amount_cents == paid[payment.order_id].amount_cents for payment in payments)


def test_init_db_creates_unique_webhook_id(tmp_path):
    conn = connect(tmp_path / "day.sqlite3")
    try:
        init_db(conn)
        init_db(conn)
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"businesses", "orders", "payments", "expenses", "webhook_events"} <= tables
        assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        conn.execute("INSERT INTO webhook_events (webhook_id) VALUES (?)", ("event-1",))
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("INSERT INTO webhook_events (webhook_id) VALUES (?)", ("event-1",))
    finally:
        conn.close()


def test_api_contract_documents_demo_endpoints():
    path = Path(__file__).resolve().parents[2] / "docs/API.md"
    assert path.is_file(), "The shared API contract must document the demo endpoints"
    contract = path.read_text()
    for endpoint in (
        "POST /api/businesses", "POST /api/orders", "GET /api/orders/{id}",
        "POST /api/payments/{id}/confirm", "POST /api/expenses/voice",
        "GET /api/closing/today", "POST /api/campaigns/simulate",
    ):
        assert endpoint in contract, f"Missing demo endpoint: {endpoint}"


def test_typescript_contract_matches_schema_fields_and_nullability():
    import re

    from app import schemas

    source = (Path(__file__).resolve().parents[2] / "web/src/lib/types.ts").read_text()
    interfaces = {
        name: (parent, dict(re.findall(r"(\w+)\??:\s*([^;]+);", body)))
        for name, parent, body in re.findall(
            r"export interface (\w+)(?: extends (\w+))? \{([^}]+)\}", source
        )
    }

    def fields(name):
        parent, own = interfaces[name]
        return {**(fields(parent) if parent else {}), **own}

    for name in ("Business", "OrderCreate", "Order", "Payment", "ExpenseCreate",
                 "Expense", "Closing", "CampaignSimulation"):
        properties = getattr(schemas, name).model_json_schema()["properties"]
        actual = fields(name)
        assert actual.keys() == properties.keys(), name
        for field, spec in properties.items():
            nullable = any(item.get("type") == "null" for item in spec.get("anyOf", []))
            assert ("null" in actual[field]) == nullable, f"{name}.{field}"
    assert '"pending" | "paid" | "expired" | "failed"' in source
    assert 'export type Currency = "MXN";' in source
