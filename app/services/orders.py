"""Order persistence and single-request QR creation for the prototype.

The SQLite write lock spans the provider request to serialize idempotent retries.
A provider timeout is ambiguous: inspect pey before retrying a failed creation.
"""
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import HTTPException

from app.db import connect, init_db
from app.schemas import Business, Order, OrderCreate
from app.services.pey import FakePeyClient, PeyClient, PeyError


@contextmanager
def database(path: str):
    """Open and close inside the sync route's thread; init precedes transactions."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = connect(path)
    try:
        init_db(conn)
        conn.execute("PRAGMA busy_timeout = 15000")
        yield conn
    except sqlite3.OperationalError as error:
        if "locked" in str(error):
            raise HTTPException(503, "Cobro en proceso; reintenta con la misma clave") from None
        raise
    finally:
        conn.close()


def find_business(conn, business_id: str) -> Business:
    row = conn.execute("SELECT * FROM businesses WHERE id = ?", (business_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Negocio no encontrado")
    return Business.model_validate(dict(row))


def find_order(conn, order_id: str) -> Order:
    row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Orden no encontrada")
    return Order.model_validate(dict(row))


def create_order(conn, body: OrderCreate, key: str, pey: PeyClient) -> tuple[Order, bool]:
    conn.execute("BEGIN IMMEDIATE")
    find_business(conn, body.business_id)
    row = conn.execute(
        "SELECT * FROM orders WHERE business_id = ? AND idempotency_key = ?",
        (body.business_id, key),
    ).fetchone()
    if row is not None:
        existing = Order.model_validate(dict(row))
        if any(getattr(existing, field) != getattr(body, field)
               for field in ("amount_cents", "concept", "currency")):
            raise HTTPException(409, "La clave ya corresponde a otro cobro")
        return existing, False

    # Legacy demo IDs are text. Numeric IDs remain unique and fit pey's numRef.
    number = conn.execute("""SELECT COALESCE(MAX(CASE
        WHEN id NOT GLOB '*[^0-9]*' THEN CAST(id AS INTEGER) ELSE 0 END), 0) + 1
        FROM orders""").fetchone()[0]
    if number > 9_999_999:
        raise HTTPException(503, "No hay referencias de cobro disponibles")
    order_id = str(number)
    created_at = datetime.now(UTC)
    try:
        qr = pey.create_qr(body.amount_cents / 100, body.concept, order_id, 600)
    except PeyError:
        raise HTTPException(502, "No se pudo crear el cobro; revisa pey antes de reintentar") from None
    order = Order(
        **body.model_dump(), id=order_id, idempotency_key=key,
        codi_qr_id=qr.id, qr_string=qr.qr_string, created_at=created_at,
        expires_at=created_at + timedelta(seconds=600),
        demo_data=isinstance(pey, FakePeyClient),
    )
    values = order.model_dump(mode="json")
    columns = list(values)
    conn.execute(
        f"INSERT INTO orders ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
        list(values.values()),
    )
    conn.commit()
    return order, True
