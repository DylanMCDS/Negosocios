"""Reseñas verificadas: sólo de una orden pagada y una por orden. Las alianzas no suben las estrellas."""
import sqlite3
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException

from app.services import alliances


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute("""CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY NOT NULL,
        order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
        stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
        text TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
    )""")


def create(conn, order_id: str, stars: int, text: str) -> dict:
    conn.execute("BEGIN IMMEDIATE")
    try:
        order = conn.execute("SELECT status FROM orders WHERE id = ?", (order_id,)).fetchone()
        if order is None:
            raise HTTPException(404, "Orden no encontrada")
        if order["status"] != "paid":
            raise HTTPException(409, "Sólo se puede reseñar una orden pagada")
        if conn.execute("SELECT 1 FROM reviews WHERE order_id = ?", (order_id,)).fetchone():
            raise HTTPException(409, "Esta orden ya tiene una reseña")
        review = {"id": f"rv-{uuid.uuid4().hex[:10]}", "order_id": order_id, "stars": stars, "text": text,
                  "created_at": datetime.now(UTC).isoformat()}
        conn.execute("INSERT INTO reviews (id, order_id, stars, text, created_at) VALUES (:id, :order_id, :stars, :text, :created_at)", review)
        return review
    finally:
        conn.commit()


def reputation(conn, business_id: str) -> dict:
    """Estrellas sólo de reseñas de compras reales; los avales de aliados se cuentan aparte."""
    if conn.execute("SELECT 1 FROM businesses WHERE id = ?", (business_id,)).fetchone() is None:
        raise HTTPException(404, "Negocio no encontrado")
    stats = conn.execute(
        "SELECT COUNT(*) AS n, AVG(r.stars) AS avg FROM reviews r JOIN orders o ON o.id = r.order_id WHERE o.business_id = ?",
        (business_id,)).fetchone()
    endorsements = conn.execute(
        "SELECT COUNT(*) FROM alliances WHERE status = 'active' AND (business_a = ? OR business_b = ?)",
        (business_id, business_id)).fetchone()[0]
    return {"rating": round(stats["avg"], 2) if stats["n"] else None, "reviews_count": stats["n"], "endorsements": endorsements}


def ensure_all(conn: sqlite3.Connection) -> None:
    alliances.ensure_tables(conn)
    ensure_tables(conn)
