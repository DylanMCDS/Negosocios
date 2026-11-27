"""Gastos, cierre del día y carga de la jornada demo (SQLite, centavos MXN)."""
import json
import sqlite3
import uuid
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.db import connect, init_db
from app.services import finance

TZ = ZoneInfo("America/Mexico_City")
FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "demo_day.json"
FORMULA = "100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)"


def get_conn() -> Iterator[sqlite3.Connection]:
    path = Path(get_settings().database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(path)
    try:
        init_db(conn)
        yield conn
    finally:
        conn.close()


def business_exists(conn: sqlite3.Connection, business_id: str) -> bool:
    return conn.execute("SELECT 1 FROM businesses WHERE id = ?", (business_id,)).fetchone() is not None


def add_expense(conn: sqlite3.Connection, data: dict) -> dict:
    row = {**data, "id": f"exp-{uuid.uuid4().hex[:12]}", "date": data["date"].isoformat(), "demo_data": False}
    conn.execute(
        "INSERT INTO expenses (id, business_id, amount_cents, currency, category, date, source, description, demo_data)"
        " VALUES (:id, :business_id, :amount_cents, :currency, :category, :date, :source, :description, 0)",
        row,
    )
    conn.commit()
    return row


def _local_date(iso: str | None):
    return datetime.fromisoformat(iso).astimezone(TZ).date() if iso else None


def _order(row: sqlite3.Row) -> dict:
    out = dict(row)
    for key in ("reconciliation_required", "demo_data"):
        out[key] = bool(out[key])
    return out


def closing_today(conn: sqlite3.Connection, business_id: str) -> dict:
    today = datetime.now(TZ).date()
    orders = [_order(r) for r in conn.execute("SELECT * FROM orders WHERE business_id = ?", (business_id,))]
    sales = [o for o in orders if _local_date(o["paid_at"] if o["status"] == "paid" else o["created_at"]) == today]
    expenses = [
        dict(r) for r in conn.execute("SELECT * FROM expenses WHERE business_id = ? AND date = ?", (business_id, today.isoformat()))
    ]
    return finance.closing(sales, expenses)


def simulate(price: int, variable_cost: int, min_contribution: int, budget: int) -> dict:
    result = finance.max_discount(price, variable_cost, min_contribution)
    pct = result["max_discount_pct"]
    uses = None
    if result["ok"] and pct and pct > 0:
        uses = budget // (price - variable_cost - min_contribution)  # exact integer centavos
    elif result["ok"]:
        result = {"ok": False, "max_discount_pct": None, "message": "no hay margen para descontar"}
    return {**result, "formula": FORMULA, "budget_cents": budget, "max_uses": uses, "currency": "MXN"}


def seed_demo(conn: sqlite3.Connection) -> dict:
    d = json.loads(FIXTURE.read_text(encoding="utf-8"))
    biz = d["business"]
    conn.execute(
        "INSERT OR IGNORE INTO businesses (id, name, category, zone, temporary_location, location_expires_at, demo_data)"
        " VALUES (:id, :name, :category, :zone, :temporary_location, :location_expires_at, 1)", biz)
    for o in d["orders"]:
        conn.execute(
            "INSERT OR IGNORE INTO orders (id, business_id, amount_cents, currency, concept, status, idempotency_key,"
            " codi_qr_id, qr_string, created_at, expires_at, paid_at, demo_data) VALUES (:id, :business_id, :amount_cents, :currency,"
            " :concept, :status, :idempotency_key, :codi_qr_id, :qr_string, :created_at, :expires_at, :paid_at, 1)",
            {"codi_qr_id": None, "qr_string": None, "expires_at": None, "paid_at": None, **o})
    for p in d["payments"]:
        conn.execute(
            "INSERT OR IGNORE INTO webhook_events (webhook_id, order_id, event_type) VALUES (?, ?, 'codi.qr.payment_received')",
            (p["webhook_id"], p["order_id"]))
        conn.execute(
            "INSERT OR IGNORE INTO payments (id, order_id, codi_qr_id, transaction_id, webhook_id, amount_cents, currency, paid_at, demo_data)"
            " VALUES (:id, :order_id, :codi_qr_id, :transaction_id, :webhook_id, :amount_cents, :currency, :paid_at, 1)", p)
    for e in d["expenses"]:
        conn.execute(
            "INSERT OR IGNORE INTO expenses (id, business_id, amount_cents, currency, category, date, source, description, demo_data)"
            " VALUES (:id, :business_id, :amount_cents, :currency, :category, :date, :source, :description, 1)", e)
    conn.commit()
    return {"demo_data": True, "business_id": biz["id"]}
