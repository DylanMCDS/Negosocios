"""Procesa webhooks verificados de pey: única vía para marcar una orden `paid`."""
import sqlite3
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

PAYMENT_EVENT = "codi.qr.payment_received"


def _cents(amount) -> int | None:
    try:
        cents = Decimal(str(amount)) * 100
    except InvalidOperation:
        return None
    return int(cents) if cents == cents.to_integral_value() else None


def process_event(conn: sqlite3.Connection, webhook_id: str, event: dict) -> None:
    """Evento, Payment y transición de orden en una sola transacción; idempotente por webhook_id."""
    kind = event.get("type")
    data = event.get("data") or {}
    conn.execute("BEGIN IMMEDIATE")
    try:
        order = None
        if kind == PAYMENT_EVENT and data.get("codiQrId"):
            order = conn.execute("SELECT * FROM orders WHERE codi_qr_id = ?", (data["codiQrId"],)).fetchone()
        inserted = conn.execute(
            "INSERT OR IGNORE INTO webhook_events (webhook_id, order_id, event_type) VALUES (?, ?, ?)",
            (webhook_id, order["id"] if order else None, kind),
        ).rowcount
        if inserted and order is not None:
            _apply_payment(conn, order, webhook_id, data)
        conn.commit()
    except BaseException:
        conn.rollback()
        raise


def _apply_payment(conn: sqlite3.Connection, order: sqlite3.Row, webhook_id: str, data: dict) -> None:
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
