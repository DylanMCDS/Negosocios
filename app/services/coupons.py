"""Bearer coupons backed by a paid receipt and an atomic pre-QR reservation."""
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException

from app.services import alliances


def ensure_tables(conn):
    # Existing helpers commit schema initialization: always call BEFORE BEGIN.
    alliances.ensure_tables(conn)
    conn.execute("""CREATE TABLE IF NOT EXISTS coupons (
        token TEXT PRIMARY KEY,
        alliance_id TEXT NOT NULL REFERENCES alliances(id),
        claim_order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
        issuer_id TEXT NOT NULL REFERENCES businesses(id),
        recipient_id TEXT NOT NULL REFERENCES businesses(id),
        expires_at TEXT NOT NULL, demo_data INTEGER NOT NULL,
        redeemed_at TEXT, redeem_order_key TEXT,
        original_cents INTEGER, discount_cents INTEGER, total_cents INTEGER,
        UNIQUE(recipient_id, redeem_order_key)
    )""")
    conn.commit()


def _coupon(conn, token):
    row = conn.execute("SELECT * FROM coupons WHERE token=?", (token,)).fetchone()
    if row is None:
        raise HTTPException(404, "Cupón no encontrado")
    return row


def _view(conn, row, now):
    def business(identifier):
        found = conn.execute("SELECT id,name FROM businesses WHERE id=?", (identifier,)).fetchone()
        return dict(found)
    alliance = alliances._get(conn, row["alliance_id"])
    return {
        "token": row["token"], "alliance_id": row["alliance_id"],
        "status": "used" if row["redeemed_at"] else "expired" if datetime.fromisoformat(row["expires_at"]) <= now else "valid",
        "issuer": business(row["issuer_id"]), "redeem_at": business(row["recipient_id"]),
        "discount_pct": alliance["discount_pct"], "expires_at": row["expires_at"],
        "demo_data": bool(row["demo_data"]),
    }


def view(conn, token, now):
    return _view(conn, _coupon(conn, token), now)


def claim(conn, body, now):
    with conn:
        conn.execute("BEGIN IMMEDIATE")
        alliance = alliances._get(conn, body.alliance_id)
        if alliance["status"] != "active":
            raise HTTPException(409, "La alianza no está activa")
        issuer = body.business_id
        if body.point_id:
            if conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='points'").fetchone() is None:
                raise HTTPException(404, "Punto no encontrado")
            point = conn.execute("SELECT business_id,active FROM points WHERE id=?", (body.point_id,)).fetchone()
            if point is None:
                raise HTTPException(404, "Punto no encontrado")
            if not point["active"]:
                raise HTTPException(410, "Este punto ya no está activo")
            if issuer and issuer != point["business_id"]:
                raise HTTPException(409, "El punto no pertenece a este negocio")
            issuer = point["business_id"]
        if issuer != alliance["giver"]:
            raise HTTPException(409, "Este negocio no emite el cupón de esta alianza")
        query = """SELECT o.* FROM orders o WHERE o.business_id=? AND o.status='paid'
                   AND NOT EXISTS(SELECT 1 FROM coupons c WHERE c.claim_order_id=o.id)"""
        params = [issuer]
        if body.order_id:
            query += " AND o.id=?"
            params.append(body.order_id)
        receipt = conn.execute(query + " ORDER BY o.created_at DESC,o.id DESC LIMIT 1", params).fetchone()
        if receipt is None:
            raise HTTPException(409, "Necesitas una orden pagada de este negocio que aún no haya reclamado un cupón")
        recipient = alliance["business_b"] if issuer == alliance["business_a"] else alliance["business_a"]
        demo_business = conn.execute("SELECT MAX(demo_data) FROM businesses WHERE id IN (?,?)",
                                     (issuer, recipient)).fetchone()[0]
        token = secrets.token_urlsafe(32)
        conn.execute("""INSERT INTO coupons(token,alliance_id,claim_order_id,issuer_id,recipient_id,expires_at,demo_data)
            VALUES (?,?,?,?,?,?,?)""", (token, alliance["id"], receipt["id"], issuer, recipient,
                                        (now + timedelta(days=7)).isoformat(), int(bool(receipt["demo_data"] or demo_business))))
        return _view(conn, _coupon(conn, token), now)


def _reservation(row):
    return {"applied": True, "original_cents": row["original_cents"], "discount_cents": row["discount_cents"],
            "total_cents": row["total_cents"], "currency": "MXN", "demo_data": bool(row["demo_data"])}


def redeem(conn, token, body, now):
    with conn:
        conn.execute("BEGIN IMMEDIATE")
        row = _coupon(conn, token)
        if body.business_id != row["recipient_id"]:
            raise HTTPException(409, "Este cupón no vale en este negocio")
        matches = conn.execute("SELECT * FROM orders WHERE business_id=? AND (id=? OR idempotency_key=?)",
                               (body.business_id, body.order_id, body.order_id)).fetchall()
        if len(matches) > 1:
            raise HTTPException(409, "La referencia del cobro es ambigua; usa una clave sin coincidencias")
        order = matches[0] if matches else None
        names = {body.order_id}
        if order:
            names.update((order["id"], order["idempotency_key"]))
        if row["redeemed_at"]:
            if row["redeem_order_key"] in names and row["original_cents"] == body.amount_cents:
                return _reservation(row)
            raise HTTPException(409, "Este cupón ya se usó")
        if datetime.fromisoformat(row["expires_at"]) <= now:
            raise HTTPException(409, "Este cupón venció")
        alliance = alliances._get(conn, row["alliance_id"])
        if alliance["status"] != "active":
            raise HTTPException(409, "La alianza no está activa")
        marks = ",".join("?" for _ in names)
        prior = conn.execute(f"""SELECT 1 FROM coupons WHERE recipient_id=? AND redeem_order_key IN ({marks})
            AND redeemed_at IS NOT NULL""", (body.business_id, *names)).fetchone()
        legacy = conn.execute(f"""SELECT 1 FROM referrals r JOIN alliances a ON a.id=r.alliance_id
            WHERE a.giver=? AND r.order_id IN ({marks})""", (body.business_id, *names)).fetchone()
        if prior or legacy:
            raise HTTPException(409, "Este cobro ya tiene un beneficio")
        amount = body.amount_cents
        required = -(-(alliance["variable_cost_cents"] + alliance["min_contribution_cents"]) * amount // alliance["price_cents"])
        discount = min(alliances._discount_cents(amount, alliance["discount_pct"]), max(amount - required, 0))
        if discount <= 0 or discount >= amount:
            raise HTTPException(409, "Este importe no deja margen para un descuento")
        if alliance["uses"] >= alliance["max_uses"]:
            raise HTTPException(409, "Se agotaron los usos de la alianza")
        if alliance["budget_used_cents"] + discount > alliance["budget_cents"]:
            raise HTTPException(409, "No hay presupuesto de la alianza")
        total = amount - discount
        if order and (order["status"] != "pending" or order["amount_cents"] != total or
                      (order["expires_at"] and datetime.fromisoformat(order["expires_at"]) <= now)):
            raise HTTPException(409, "Crea el cobro con el total del cupón antes de emitir su QR; no se cambia un cobro existente")
        key = order["idempotency_key"] if order else body.order_id
        conn.execute("""UPDATE coupons SET redeemed_at=?,redeem_order_key=?,original_cents=?,discount_cents=?,total_cents=?
            WHERE token=?""", (now.isoformat(), key, amount, discount, total, token))
        conn.execute("UPDATE alliances SET uses=uses+1,budget_used_cents=budget_used_cents+? WHERE id=?",
                     (discount, alliance["id"]))
        return _reservation(_coupon(conn, token))
