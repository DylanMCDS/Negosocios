"""Alianzas entre negocios: descuento acotado por finance.max_discount, presupuesto y usos reservados atómicamente.

Un descuento nunca puede dejar al negocio que lo da por debajo de su contribución mínima. Las métricas
muestran correlación observada (compras pagadas con un código de alianza), no causalidad.
"""
import secrets
import sqlite3
import uuid
from datetime import UTC, datetime, timedelta
from decimal import ROUND_FLOOR, Decimal

from fastapi import HTTPException

from app.services import finance

# A proposal to a demo business (businesses.demo_data = 1) is accepted by itself after this many seconds.
DEMO_ACCEPT_SECONDS = 3

NOTE = "Estimación basada en una correlación observada entre la alianza y compras pagadas; no demuestra causalidad."


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS alliances (
            id TEXT PRIMARY KEY NOT NULL,
            business_a TEXT NOT NULL REFERENCES businesses(id),
            business_b TEXT NOT NULL REFERENCES businesses(id),
            giver TEXT NOT NULL REFERENCES businesses(id),
            status TEXT NOT NULL DEFAULT 'proposal' CHECK (status IN ('proposal', 'active', 'closed')),
            discount_pct REAL NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
            price_cents INTEGER NOT NULL, variable_cost_cents INTEGER NOT NULL, min_contribution_cents INTEGER NOT NULL,
            budget_cents INTEGER NOT NULL, budget_used_cents INTEGER NOT NULL DEFAULT 0,
            max_uses INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0,
            referral_code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
            CHECK (business_a <> business_b)
        );
        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY NOT NULL,
            alliance_id TEXT NOT NULL REFERENCES alliances(id),
            order_id TEXT NOT NULL,
            original_cents INTEGER NOT NULL, discount_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (alliance_id, order_id)
        );
    """)


def _get(conn, alliance_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM alliances WHERE id = ?", (alliance_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Alianza no encontrada")
    return row


def _view(row: sqlite3.Row) -> dict:
    return dict(row)


def settle_demo_proposals(conn) -> None:
    """A proposal to a demo business accepts itself after DEMO_ACCEPT_SECONDS so the whole flow can be walked through.
    Real businesses are never touched: they keep asking for acceptance."""
    cutoff = (datetime.now(UTC) - timedelta(seconds=DEMO_ACCEPT_SECONDS)).isoformat()
    conn.execute(
        "UPDATE alliances SET status = 'active' WHERE status = 'proposal' AND created_at <= ? AND business_b IN"
        " (SELECT id FROM businesses WHERE demo_data = 1)", (cutoff,))
    conn.commit()


def _is_demo(conn, row: sqlite3.Row) -> bool:
    found = conn.execute("SELECT demo_data FROM businesses WHERE id = ?", (row["business_b"],)).fetchone()
    return bool(found and found["demo_data"])


def propose(conn, data: dict) -> dict:
    a, b, giver = data["business_a"], data["business_b"], data["giver"]
    if a == b:
        raise HTTPException(422, "Una alianza necesita dos negocios distintos")
    if giver not in (a, b):
        raise HTTPException(422, "El negocio que da el descuento debe ser parte de la alianza")
    for bid in (a, b):
        if conn.execute("SELECT 1 FROM businesses WHERE id = ?", (bid,)).fetchone() is None:
            raise HTTPException(404, "Negocio no encontrado")
    limit = finance.max_discount(data["price_cents"], data["variable_cost_cents"], data["min_contribution_cents"])
    pct = data["discount_pct"]
    margin = data["price_cents"] - data["variable_cost_cents"] - data["min_contribution_cents"]
    # The percentage is rounded to 2 decimals; the real limit is whole cents of the price.
    over_in_cents = _discount_cents(data["price_cents"], pct) > margin
    if not limit["ok"] or pct > limit["max_discount_pct"] or over_in_cents:
        top = limit["max_discount_pct"]
        if limit["ok"] and not pct > top:  # within the rounded percentage but over in cents
            top = round(max(margin, 0) * 100 / data["price_cents"], 4) if margin > 0 else 0.0
        message = (f"Un descuento de {pct} % deja al negocio por debajo de su contribución mínima; "
                   + (f"el máximo es {top} %." if limit["ok"] else limit["message"] + "."))
        raise HTTPException(422, {
            "message": message, "max_discount_pct": top, "formula": finance_formula(),
            "price_cents": data["price_cents"], "variable_cost_cents": data["variable_cost_cents"],
            "min_contribution_cents": data["min_contribution_cents"],
        })
    row = {**data, "id": f"al-{uuid.uuid4().hex[:10]}", "referral_code": secrets.token_hex(4).upper(),
           "created_at": datetime.now(UTC).isoformat()}
    conn.execute(
        "INSERT INTO alliances (id, business_a, business_b, giver, discount_pct, price_cents, variable_cost_cents,"
        " min_contribution_cents, budget_cents, max_uses, referral_code, created_at) VALUES (:id, :business_a,"
        " :business_b, :giver, :discount_pct, :price_cents, :variable_cost_cents, :min_contribution_cents,"
        " :budget_cents, :max_uses, :referral_code, :created_at)", row)
    conn.commit()
    created = _get(conn, row["id"])
    return {**_view(created), "demo": _is_demo(conn, created)}


def _discount_cents(amount_cents: int, pct) -> int:
    return int((Decimal(amount_cents) * Decimal(str(pct)) / 100).to_integral_value(ROUND_FLOOR))


def finance_formula() -> str:
    return "100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)"


def accept(conn, alliance_id: str) -> dict:
    conn.execute("BEGIN IMMEDIATE")
    row = _get(conn, alliance_id)
    if row["status"] != "proposal":
        conn.rollback()
        raise HTTPException(409, "Sólo una propuesta se puede aceptar")
    conn.execute("UPDATE alliances SET status = 'active' WHERE id = ?", (alliance_id,))
    conn.commit()
    return _view(_get(conn, alliance_id))


def _identities(conn, giver: str, ref: str) -> tuple[str, set[str]]:
    """One purchase can be named by its order id or by the Idempotency-Key it was created with."""
    order = conn.execute(
        "SELECT id, idempotency_key FROM orders WHERE business_id = ? AND (id = ? OR idempotency_key = ?)",
        (giver, ref, ref)).fetchone()
    if order is None:
        return ref, {ref}
    return order["id"], {ref, order["id"], order["idempotency_key"]}


def quote(conn, alliance_id: str, amount_cents: int, order_id: str) -> dict:
    """Reserva el beneficio una sola vez por orden; presupuesto y usos se descuentan en la misma transacción."""
    settle_demo_proposals(conn)
    conn.execute("BEGIN IMMEDIATE")
    try:
        row = _get(conn, alliance_id)
        if row["status"] != "active":
            raise HTTPException(409, "La alianza no está activa")
        canonical, names = _identities(conn, row["giver"], order_id)
        marks = ",".join("?" * len(names))
        if conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='coupons'").fetchone():
            reserved = conn.execute(
                f"SELECT 1 FROM coupons WHERE recipient_id=? AND redeem_order_key IN ({marks}) AND redeemed_at IS NOT NULL",
                (row["giver"], *names)).fetchone()
            if reserved:
                raise HTTPException(409, "Este cobro ya tiene el beneficio de un cupón")
        prior = conn.execute(
            f"SELECT * FROM referrals WHERE alliance_id = ? AND order_id IN ({marks})", (alliance_id, *names)).fetchone()
        if prior is not None:
            return _result(row, True, prior["original_cents"], prior["discount_cents"], None)
        # Never leave the giver below its minimum contribution, in whole cents, for this amount.
        required = -(-(row["variable_cost_cents"] + row["min_contribution_cents"]) * amount_cents // row["price_cents"])
        discount = min(_discount_cents(amount_cents, row["discount_pct"]), max(amount_cents - required, 0))
        reason = None
        if discount <= 0:
            reason = "Este importe no deja margen para un descuento"
        elif row["uses"] >= row["max_uses"]:
            reason = "Se agotaron los usos de la alianza"
        elif row["budget_used_cents"] + discount > row["budget_cents"]:
            reason = "El presupuesto de la alianza no alcanza para este descuento"
        if reason is not None:
            return _result(row, False, amount_cents, 0, reason)
        conn.execute(
            "INSERT INTO referrals (id, alliance_id, order_id, original_cents, discount_cents, total_cents, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (f"rf-{uuid.uuid4().hex[:10]}", alliance_id, canonical, amount_cents, discount, amount_cents - discount,
             datetime.now(UTC).isoformat()))
        conn.execute("UPDATE alliances SET uses = uses + 1, budget_used_cents = budget_used_cents + ? WHERE id = ?",
                     (discount, alliance_id))
        fresh = _get(conn, alliance_id)
        return _result(fresh, True, amount_cents, discount, None)
    finally:
        conn.commit()


def _result(row, applied: bool, original: int, discount: int, reason: str | None) -> dict:
    return {
        "applied": applied, "original_cents": original, "discount_cents": discount, "total_cents": original - discount,
        "budget_remaining_cents": row["budget_cents"] - row["budget_used_cents"],
        "uses_remaining": row["max_uses"] - row["uses"], "reason": reason, "currency": "MXN",
    }


def metrics(conn, alliance_id: str) -> dict:
    row = _get(conn, alliance_id)
    refs = conn.execute("SELECT * FROM referrals WHERE alliance_id = ?", (alliance_id,)).fetchall()
    paid_total = paid_count = contribution = 0
    seen: set[str] = set()
    for ref in refs:
        order = conn.execute(
            "SELECT id, amount_cents FROM orders WHERE business_id = ? AND status = 'paid' AND (id = ? OR idempotency_key = ?)",
            (row["giver"], ref["order_id"], ref["order_id"])).fetchone()
        if order is None or order["id"] in seen:
            continue
        seen.add(order["id"])
        paid_count += 1
        paid_total += order["amount_cents"]
        cost = row["variable_cost_cents"] * ref["original_cents"] // row["price_cents"]
        contribution += order["amount_cents"] - cost
    return {
        "alliance_id": alliance_id, "referrals": len(refs), "paid_purchases": paid_count,
        "paid_sales_cents": paid_total, "benefit_cost_cents": sum(r["discount_cents"] for r in refs),
        "estimated_contribution_cents": contribution, "currency": "MXN", "note": NOTE,
    }


def _business_name(conn, business_id: str) -> str:
    row = conn.execute("SELECT name FROM businesses WHERE id = ?", (business_id,)).fetchone()
    return row["name"] if row else business_id


def list_for(conn, business_id: str) -> list[dict]:
    """Alianzas de un negocio, con el socio y su papel (quien da el descuento o quien refiere)."""
    if conn.execute("SELECT 1 FROM businesses WHERE id = ?", (business_id,)).fetchone() is None:
        raise HTTPException(404, "Negocio no encontrado")
    settle_demo_proposals(conn)
    rows = conn.execute(
        "SELECT * FROM alliances WHERE business_a = ? OR business_b = ? ORDER BY created_at DESC",
        (business_id, business_id)).fetchall()
    items = []
    for row in rows:
        partner = row["business_b"] if row["business_a"] == business_id else row["business_a"]
        items.append({**_view(row), "demo": _is_demo(conn, row), "partner_id": partner, "partner_name": _business_name(conn, partner),
                      "role": "giver" if row["giver"] == business_id else "referrer"})
    return items


def by_code(conn, code: str) -> dict:
    """Lo mínimo que Cobrar necesita para aplicar un código; costos y contribución mínima no se exponen."""
    settle_demo_proposals(conn)
    row = conn.execute("SELECT * FROM alliances WHERE referral_code = ?", (code.upper(),)).fetchone()
    if row is None:
        raise HTTPException(404, "Código de referido no encontrado")
    return {
        "id": row["id"], "status": row["status"], "giver": row["giver"], "giver_name": _business_name(conn, row["giver"]),
        "discount_pct": row["discount_pct"], "referral_code": row["referral_code"],
        "budget_remaining_cents": row["budget_cents"] - row["budget_used_cents"],
        "uses_remaining": row["max_uses"] - row["uses"],
    }
