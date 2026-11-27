"""Split an order into parts, each with its own CoDi QR. No balances: every part pays the business directly.

Parts live in their own table, not in `orders`: the daily closing sums paid orders, so child orders
would be counted twice. The parent order turns `paid` only when every part is paid.
"""
import sqlite3
from datetime import UTC, datetime

from fastapi import HTTPException

from app.services.pey import PeyClient, PeyError

MAX_PARTS = 20
FIRST_NUM_REF = 9_999_999  # part references count down from the top; orders count up from 1


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS order_splits ("
        " id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id), idx INTEGER NOT NULL,"
        " amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents > 0),"
        " num_ref TEXT NOT NULL, codi_qr_id TEXT NOT NULL UNIQUE, qr_string TEXT,"
        " status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),"
        " paid_at TEXT, transaction_id TEXT, UNIQUE (order_id, idx))"
    )


def plan_amounts(total: int, parts: int | None, amounts: list[int] | None) -> list[int]:
    """Integer centavos for each part; raises ValueError with a message the owner can act on."""
    if (parts is None) == (amounts is None):
        raise ValueError("Indica 'parts' (partes iguales) o 'amounts_cents' (montos), no ambos")
    if parts is not None:
        if not 2 <= parts <= MAX_PARTS:
            raise ValueError(f"Las partes deben ser entre 2 y {MAX_PARTS}")
        base, rest = divmod(total, parts)
        if base < 1:
            raise ValueError("El importe es demasiado pequeño para dividirlo en tantas partes")
        return [base + rest, *([base] * (parts - 1))]  # the leftover cents go to the first part
    assert amounts is not None
    if not 2 <= len(amounts) <= MAX_PARTS:
        raise ValueError(f"Las partes deben ser entre 2 y {MAX_PARTS}")
    if any(not isinstance(a, int) or isinstance(a, bool) or a < 1 for a in amounts):
        raise ValueError("Cada parte debe ser un importe positivo en centavos")
    if sum(amounts) != total:
        raise ValueError(f"Los montos suman {sum(amounts)} y la orden es de {total} centavos")
    return list(amounts)


def _next_num_ref(conn: sqlite3.Connection) -> int:
    low = conn.execute("SELECT MIN(CAST(num_ref AS INTEGER)) FROM order_splits").fetchone()[0]
    ref = (low - 1) if low is not None else FIRST_NUM_REF
    top_order = conn.execute(
        "SELECT COALESCE(MAX(CASE WHEN id NOT GLOB '*[^0-9]*' THEN CAST(id AS INTEGER) ELSE 0 END), 0) FROM orders"
    ).fetchone()[0]
    if ref <= top_order:
        raise HTTPException(503, "No hay referencias de cobro disponibles")
    return ref


def is_split(conn: sqlite3.Connection, order_id: str) -> bool:
    ensure_tables(conn)
    return conn.execute("SELECT 1 FROM order_splits WHERE order_id = ? LIMIT 1", (order_id,)).fetchone() is not None


def get_split(conn: sqlite3.Connection, order_id: str) -> dict | None:
    ensure_tables(conn)
    rows = conn.execute("SELECT * FROM order_splits WHERE order_id = ? ORDER BY idx", (order_id,)).fetchall()
    if not rows:
        return None
    parts = [
        {
            "idx": r["idx"], "amount_cents": r["amount_cents"], "status": r["status"], "paid_at": r["paid_at"],
            "codi_qr_id": r["codi_qr_id"], "qr_string": r["qr_string"],
        }
        for r in rows
    ]
    return {
        "order_id": order_id, "currency": "MXN", "parts": parts,
        "total_cents": sum(p["amount_cents"] for p in parts),
        "paid_cents": sum(p["amount_cents"] for p in parts if p["status"] == "paid"),
        "missing": [p["idx"] for p in parts if p["status"] != "paid"],
    }


def create_split(conn: sqlite3.Connection, order_id: str, parts: int | None, amounts: list[int] | None, pey: PeyClient) -> dict:
    ensure_tables(conn)
    conn.commit()
    conn.execute("BEGIN IMMEDIATE")
    order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if order is None:
        raise HTTPException(404, "Orden no encontrada")
    if order["status"] != "pending":
        raise HTTPException(409, "Solo se pueden dividir órdenes pendientes")
    if order["expires_at"] and datetime.fromisoformat(order["expires_at"]) <= datetime.now(UTC):
        raise HTTPException(409, "La orden ya venció; genera otro cobro")
    if is_split(conn, order_id):
        raise HTTPException(409, "La orden ya está dividida")
    try:
        plan = plan_amounts(order["amount_cents"], parts, amounts)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    total = len(plan)
    for idx, cents in enumerate(plan, start=1):
        num_ref = _next_num_ref(conn)
        concept = f"{order['concept']} {idx}/{total}"[:40]
        try:
            qr = pey.create_qr(cents / 100, concept, str(num_ref), 600)
        except PeyError:
            raise HTTPException(502, "No se pudo crear el cobro de una parte; revisa pey antes de reintentar") from None
        conn.execute(
            "INSERT INTO order_splits (id, order_id, idx, amount_cents, num_ref, codi_qr_id, qr_string) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (f"{order_id}-{idx}", order_id, idx, cents, str(num_ref), qr.id, qr.qr_string),
        )
    conn.commit()
    return get_split(conn, order_id)  # type: ignore[return-value]


def find_part_by_qr(conn: sqlite3.Connection, codi_qr_id: str) -> sqlite3.Row | None:
    ensure_tables(conn)
    return conn.execute("SELECT * FROM order_splits WHERE codi_qr_id = ?", (codi_qr_id,)).fetchone()


def mark_part_paid(conn: sqlite3.Connection, part: sqlite3.Row, transaction_id: str, paid_at: str) -> bool:
    """Marks one part paid; returns True when that completes the order (the caller marks the order paid)."""
    conn.execute(
        "UPDATE order_splits SET status = 'paid', paid_at = ?, transaction_id = ? WHERE id = ?",
        (paid_at, transaction_id, part["id"]),
    )
    left = conn.execute(
        "SELECT COUNT(*) FROM order_splits WHERE order_id = ? AND status != 'paid'", (part["order_id"],)
    ).fetchone()[0]
    return left == 0

