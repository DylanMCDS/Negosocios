"""Procesa webhooks verificados de pey: única vía para marcar una orden `paid`."""
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from app.services import splits

PAYMENT_EVENT = "codi.qr.payment_received"
PUSH_EVENT = "codi.pn.payment_received"
log = logging.getLogger(__name__)


def ensure_push_table(conn: sqlite3.Connection) -> None:
    conn.execute("""CREATE TABLE IF NOT EXISTS push_requests (
        transaction_id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id),
        codi_id TEXT, phone_last4 TEXT NOT NULL, created_at TEXT NOT NULL)""")


def record_push(conn: sqlite3.Connection, order_id: str, transaction_id: str, codi_id: str | None, phone: str) -> None:
    """Guarda sólo lo necesario para asociar el pago: el teléfono completo nunca se persiste."""
    ensure_push_table(conn)
    conn.execute(
        "INSERT OR REPLACE INTO push_requests (transaction_id, order_id, codi_id, phone_last4, created_at) VALUES (?, ?, ?, ?, ?)",
        (transaction_id, order_id, codi_id, phone[-4:], datetime.now(timezone.utc).isoformat()))


def _cents(amount) -> int | None:
    try:
        cents = Decimal(str(amount)) * 100
    except InvalidOperation:
        return None
    return int(cents) if cents == cents.to_integral_value() else None


def process_event(conn: sqlite3.Connection, webhook_id: str, event: dict) -> None:
    """Evento, Payment y transición de orden en una sola transacción; idempotente por webhook_id."""
    kind = event.get("type")
    # El payload real de pey es PLANO. `data` anidado sólo por compatibilidad: nunca existió en pey.
    data = event if "codiQrId" in event or "data" not in event else (event.get("data") or {})
    ensure_push_table(conn)
    splits.ensure_tables(conn)
    conn.commit()
    conn.execute("BEGIN IMMEDIATE")
    try:
        order = None
        part = None
        if kind == PAYMENT_EVENT and data.get("codiQrId"):
            order = conn.execute("SELECT * FROM orders WHERE codi_qr_id = ?", (data["codiQrId"],)).fetchone()
            if order is None:  # the QR of one part of a split order
                part = splits.find_part_by_qr(conn, data["codiQrId"])
                if part is not None:
                    order = conn.execute("SELECT * FROM orders WHERE id = ?", (part["order_id"],)).fetchone()
        elif kind == PUSH_EVENT and data.get("transactionId"):
            # El payload del push no trae codiQrId: se asocia por el transactionId que pey devolvió al enviarlo.
            order = conn.execute(
                "SELECT o.* FROM orders o JOIN push_requests p ON p.order_id = o.id WHERE p.transaction_id = ?",
                (data["transactionId"],)).fetchone()
        inserted = conn.execute(
            "INSERT OR IGNORE INTO webhook_events (webhook_id, order_id, event_type) VALUES (?, ?, ?)",
            (webhook_id, order["id"] if order else None, kind),
        ).rowcount
        if inserted and order is not None and part is not None:
            _apply_part_payment(conn, order, part, webhook_id, data)
        elif inserted and order is not None:
            _apply_payment(conn, order, webhook_id, data)
        elif inserted and kind in (PAYMENT_EVENT, PUSH_EVENT):
            # Sólo tipo y QR (sin concepto, metadata ni datos del pagador) para diagnosticar.
            log.warning("pago pey sin orden: type=%s ref=%s", kind, data.get("codiQrId") or data.get("transactionId"))
        conn.commit()
    except BaseException:
        conn.rollback()
        raise


def _flag(conn: sqlite3.Connection, order_id: str, reason: str) -> None:
    conn.execute("UPDATE orders SET reconciliation_required = 1, reconciliation_reason = ? WHERE id = ?", (reason, order_id))


def _apply_part_payment(conn: sqlite3.Connection, order: sqlite3.Row, part: sqlite3.Row, webhook_id: str, data: dict) -> None:
    """One part of a split order: the order turns paid only when every part is paid."""
    cents = _cents(data.get("amount"))
    transaction_id = data.get("transactionId")
    label = f"parte {part['idx']}"
    if cents is None or not transaction_id:
        reason = f"{label}: evento de pago sin monto o transactionId válidos"
    elif cents != part["amount_cents"]:
        reason = f"{label}: monto pagado {cents} distinto del esperado {part['amount_cents']}"
    elif part["status"] == "paid":
        reason = f"pago adicional sobre la {label} ya pagada"
    elif order["status"] != "pending":
        reason = f"{label}: pago recibido con la orden en estado {order['status']}"
    else:
        reason = None
    if reason is not None:
        _flag(conn, order["id"], reason)
        return
    paid_at = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO payments (id, order_id, codi_qr_id, transaction_id, webhook_id, amount_cents, currency, paid_at, demo_data)"
        " VALUES (?, ?, ?, ?, ?, ?, 'MXN', ?, ?)",
        (f"pay-{uuid.uuid4().hex[:12]}", order["id"], part["codi_qr_id"], transaction_id, webhook_id, cents, paid_at, order["demo_data"]),
    )
    if splits.mark_part_paid(conn, part, transaction_id, paid_at):
        conn.execute("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?", (paid_at, order["id"]))


def _apply_payment(conn: sqlite3.Connection, order: sqlite3.Row, webhook_id: str, data: dict) -> None:
    if splits.is_split(conn, order["id"]):
        _flag(conn, order["id"], "orden dividida: se pagó el QR completo en lugar de las partes")
        return
    cents = _cents(data.get("amount"))
    transaction_id = data.get("transactionId")
    if cents is None or not transaction_id:
        reason = "evento de pago sin monto o transactionId válidos"
    elif cents != order["amount_cents"]:
        reason = f"monto pagado {cents} distinto del esperado {order['amount_cents']}"
    elif order["status"] == "paid":
        reason = "pago adicional sobre una orden ya pagada"
    elif order["status"] != "pending":
        reason = f"pago recibido con la orden en estado {order['status']}"
    else:
        reason = None
    if reason is not None:
        conn.execute(
            "UPDATE orders SET reconciliation_required = 1, reconciliation_reason = ? WHERE id = ?",
            (reason, order["id"]),
        )
        return
    paid_at = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO payments (id, order_id, codi_qr_id, transaction_id, webhook_id, amount_cents, currency, paid_at, demo_data)"
        " VALUES (?, ?, ?, ?, ?, ?, 'MXN', ?, ?)",
        (f"pay-{uuid.uuid4().hex[:12]}", order["id"], order["codi_qr_id"], transaction_id, webhook_id, cents, paid_at, order["demo_data"]),
    )
    conn.execute("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?", (paid_at, order["id"]))
