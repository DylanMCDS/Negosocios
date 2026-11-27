"""Motor de finanzas (funciones puras, stdlib). Montos en centavos MXN."""

BELOW_TARGET = "el precio actual ya incumple la meta"


def max_discount(price: int, variable_cost: int, min_contribution: int) -> dict:
    """Descuento máximo = 1 − (costo + contribución mínima) / precio (§9.1).

    Un resultado negativo no es un descuento: se reporta como incumplimiento.
    """
    if price <= 0:
        raise ValueError("price must be positive")
    pct = round((1 - (variable_cost + min_contribution) / price) * 100, 2)
    if pct < 0:
        return {"ok": False, "max_discount_pct": None, "message": BELOW_TARGET}
    return {"ok": True, "max_discount_pct": pct, "message": None}


def closing(sales: list, expenses: list) -> dict:
    """Cierre del día: sólo cuentan órdenes `paid`; las `pending` van aparte."""
    paid = [s for s in sales if s.get("status") == "paid"]
    pending = [s for s in sales if s.get("status") == "pending"]
    confirmed = sum(s["amount_cents"] for s in paid)
    spent = sum(e["amount_cents"] for e in expenses)
    missing = []
    if not paid:
        missing.append("sales")
    if not expenses:
        missing.append("expenses")
    return {
        "currency": "MXN",
        "confirmed_sales_cents": confirmed,
        "expenses_cents": spent,
        "estimated_profit_cents": confirmed - spent,
        "pending": pending,
        "pending_cents": sum(s["amount_cents"] for s in pending),
        "missing": missing,
    }
