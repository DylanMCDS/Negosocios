"""Revocable public point links. Never create, pay or cancel a financial order.

Management follows the prototype's existing public-write contract; point IDs
identify public stickers and are not proof of authenticated business ownership.
"""
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Annotated, Literal
from urllib.parse import quote, urlencode

from fastapi import HTTPException
from pydantic import Field, StringConstraints

from app.schemas import Contract
from app.services.orders import database, find_business

INACTIVE = "Este punto ya no está activo"
NO_STORE = {"Cache-Control": "no-store"}


class PointCreate(Contract):
    business_id: Annotated[str, Field(min_length=1)]
    kind: Literal["entrance", "cashier", "table"]
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class PointOrder(Contract):
    order_id: Annotated[str, Field(min_length=1)]


@contextmanager
def points_db(path):
    with database(path) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS points (
            id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id),
            kind TEXT NOT NULL CHECK(kind IN ('entrance','cashier','table')),
            label TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS point_orders (
            point_id TEXT NOT NULL REFERENCES points(id),
            order_id TEXT NOT NULL REFERENCES orders(id), PRIMARY KEY(point_id,order_id)
        )""")
        yield conn


def _time(value):
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


def _eligible(row, now):
    return row["status"] == "pending" and (not row["expires_at"] or _time(row["expires_at"]) > now)


def _brief(row):
    return {key: row[key] for key in ("id", "concept", "amount_cents", "currency", "created_at", "expires_at")} | {
        "url": f'/pagar/{quote(row["id"], safe="")}', "demo_data": bool(row["demo_data"]),
    }


def _pending(conn, business_id, now, point_id=None):
    sql = "SELECT o.* FROM orders o"
    params = [business_id]
    if point_id is not None:
        sql += " JOIN point_orders po ON po.order_id=o.id AND po.point_id=?"
        params.insert(0, point_id)
    rows = conn.execute(sql + " WHERE o.business_id=? AND o.status='pending'", params).fetchall()
    return sorted((row for row in rows if _eligible(row, now)),
                  key=lambda row: (_time(row["created_at"]), row["id"]), reverse=True)


def _point(conn, point_id, *, active=False):
    row = conn.execute("SELECT * FROM points WHERE id=?", (point_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "No encontramos este punto", headers=NO_STORE)
    if active and not row["active"]:
        raise HTTPException(410, INACTIVE, headers=NO_STORE)
    return row


def _public(conn, row, now):
    business = find_business(conn, row["business_id"])
    return dict(row) | {
        "active": bool(row["active"]), "path": f'/p/{quote(row["id"], safe="")}',
        "demo_data": business.demo_data,
        "pending_count": len(_pending(conn, row["business_id"], now, row["id"])),
    }


def create_point(path, body, now):
    with points_db(path) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        find_business(conn, body.business_id)
        for _ in range(5):
            token = secrets.token_urlsafe(24)
            try:
                conn.execute("INSERT INTO points(id,business_id,kind,label) VALUES (?,?,?,?)",
                             (token, body.business_id, body.kind, body.label))
                return _public(conn, _point(conn, token), now)
            except sqlite3.IntegrityError:
                if conn.execute("SELECT 1 FROM points WHERE id=?", (token,)).fetchone() is None:
                    raise
        raise HTTPException(503, "No se pudo crear el punto. Intenta de nuevo.")


def list_points(path, business_id, now):
    with points_db(path) as conn:
        business = find_business(conn, business_id)
        rows = conn.execute("SELECT * FROM points WHERE business_id=? ORDER BY rowid DESC", (business_id,)).fetchall()
        return {"business": business.model_dump(mode="json"), "points": [_public(conn, row, now) for row in rows]}


def pending_orders(path, business_id, now):
    with points_db(path) as conn:
        find_business(conn, business_id)
        return [_brief(row) for row in _pending(conn, business_id, now)]


def link_order(path, point_id, order_id, now):
    with points_db(path) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        point = _point(conn, point_id, active=True)
        if point["kind"] == "entrance":
            raise HTTPException(409, "La entrada abre el perfil. Usa una caja o mesa para cobrar.")
        order = conn.execute("SELECT * FROM orders WHERE id=? AND business_id=?",
                             (order_id, point["business_id"])).fetchone()
        if order is None:
            raise HTTPException(404, "Cuenta no encontrada en este puesto")
        if not _eligible(order, now):
            raise HTTPException(409, "La cuenta ya no está pendiente o venció")
        conn.execute("INSERT INTO point_orders(point_id,order_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                     (point_id, order_id))
        return _public(conn, point, now)


def revoke_point(path, point_id, now):
    with points_db(path) as conn, conn:
        point = _point(conn, point_id)
        conn.execute("UPDATE points SET active=0 WHERE id=?", (point_id,))
        return _public(conn, dict(point) | {"active": 0}, now)


def resolve_point(path, point_id, now):
    with points_db(path) as conn:
        point = _point(conn, point_id, active=True)
        business = find_business(conn, point["business_id"])
        orders = [] if point["kind"] == "entrance" else [_brief(row) for row in _pending(conn, business.id, now, point_id)]
        mode = "profile" if point["kind"] == "entrance" else "payment" if len(orders) == 1 else "choose" if orders else "empty"
        url = (f"/?{urlencode({'negocio': business.id})}#negocio" if mode == "profile" else
               orders[0]["url"] if mode == "payment" else f"/#puntos/{quote(point_id, safe='')}")
        return {"point": _public(conn, point, now), "business": business.model_dump(mode="json"),
                "orders": orders, "mode": mode, "url": url}
