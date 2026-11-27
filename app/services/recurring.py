"""Recurring-expense detection and rule-based recommendations (no LLM). Integer centavos only."""
import calendar
import json
import sqlite3
from datetime import date, datetime, timedelta
from itertools import pairwise
from pathlib import Path
from statistics import median
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Mexico_City")
FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "expenses_history_demo.json"
MIN_OCCURRENCES = 3
TOLERANCE_PCT = 10
# (period, min gap, max gap, nominal gap in days) between consecutive payments
PERIODS = (("weekly", 5, 9, 7), ("biweekly", 12, 17, 14), ("monthly", 26, 35, 30))


def _today(today: date | None) -> date:
    return today or datetime.now(TZ).date()


def _ensure(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS recurring_decisions ("
        " business_id TEXT NOT NULL REFERENCES businesses(id), key TEXT NOT NULL,"
        " status TEXT NOT NULL CHECK (status IN ('confirmed', 'dismissed')),"
        " label TEXT NOT NULL, period TEXT NOT NULL, amount_cents INTEGER NOT NULL, next_due TEXT NOT NULL,"
        " decided_at TEXT NOT NULL, PRIMARY KEY (business_id, key))"
    )


def mxn(cents: int) -> str:
    pesos, rest = divmod(cents, 100)
    return f"${pesos:,}" if rest == 0 else f"${pesos:,}.{rest:02d}"


def _days(n: int) -> str:
    return "hoy" if n == 0 else f"en {n} día" + ("" if n == 1 else "s")


def seed_history(conn: sqlite3.Connection, business_id: str = "rosa", today: date | None = None) -> int:
    """Load the demo expense history (relative to `today`). Idempotent; returns rows inserted."""
    if conn.execute("SELECT 1 FROM businesses WHERE id = ?", (business_id,)).fetchone() is None:
        return 0
    base = _today(today)
    inserted = 0
    for item in json.loads(FIXTURE.read_text(encoding="utf-8"))["expenses"]:
        amounts = item.get("amounts_cents") or [item["amount_cents"]] * len(item["days_ago"])
        slug = item["description"].lower().replace(" ", "-")
        for i, (ago, cents) in enumerate(zip(item["days_ago"], amounts, strict=True)):
            cur = conn.execute(
                "INSERT OR IGNORE INTO expenses (id, business_id, amount_cents, currency, category, date, source, description, demo_data)"
                " VALUES (?, ?, ?, 'MXN', ?, ?, 'manual', ?, 1)",
                (f"hist-{slug}-{i}", business_id, cents, item["category"], (base - timedelta(days=ago)).isoformat(), item["description"]),
            )
            inserted += cur.rowcount
    conn.commit()
    return inserted


def ensure_demo_history(conn: sqlite3.Connection, business_id: str, today: date | None = None) -> int:
    """Load the labeled demo history the first time a DEMO business (demo_data = 1) is read.

    Real businesses are never touched. Startup stays free of demo expenses (HACK-019 contract);
    POST /api/demo/seed lives in another task's files, so the demo history loads here, once.
    """
    demo = conn.execute("SELECT demo_data FROM businesses WHERE id = ?", (business_id,)).fetchone()
    if demo is None or not demo["demo_data"]:
        return 0
    if conn.execute("SELECT 1 FROM expenses WHERE business_id = ? AND id LIKE 'hist-%' LIMIT 1", (business_id,)).fetchone():
        return 0
    return seed_history(conn, business_id, today)


def _add_month(d: date) -> date:
    year, month = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def _period_of(dates: list[date]) -> str | None:
    gaps = [(b - a).days for a, b in pairwise(dates)]
    for name, low, high, _ in PERIODS:
        if all(low <= g <= high for g in gaps):
            return name
    return None


def _next_due(last: date, period: str) -> date:
    if period == "monthly":
        return _add_month(last)
    return last + timedelta(days=next(n for p, _, _, n in PERIODS if p == period))


def _groups(conn: sqlite3.Connection, business_id: str, today: date) -> dict[str, list[dict]]:
    rows = conn.execute(
        "SELECT id, amount_cents, date, description, category, demo_data FROM expenses"
        " WHERE business_id = ? AND date <= ? ORDER BY date, id",  # nothing after the reference date counts
        (business_id, today.isoformat()),
    ).fetchall()
    groups: dict[str, list[dict]] = {}
    for r in rows:
        label = (r["description"] or r["category"]).strip().lower()
        groups.setdefault(label, []).append({**dict(r), "day": date.fromisoformat(r["date"])})
    return groups


def _used(items: list[dict]) -> list[dict]:
    return [{"id": i["id"], "date": i["date"], "amount_cents": i["amount_cents"]} for i in items]


def _demo(items: list[dict]) -> bool:
    return any(i["demo_data"] for i in items)


def _proposals(groups: dict[str, list[dict]], today: date) -> list[dict]:
    out = []
    for label, items in groups.items():
        if len(items) < MIN_OCCURRENCES:
            continue
        mid = median(i["amount_cents"] for i in items)
        if any(abs(i["amount_cents"] - mid) * 100 > mid * TOLERANCE_PCT for i in items):
            continue
        period = _period_of([i["day"] for i in items])
        if period is None:
            continue
        amount = items[-1]["amount_cents"]
        due = _next_due(items[-1]["day"], period)
        until = (due - today).days
        reserve = -(-amount // max(until, 1))  # ceiling: the reserve never rounds down
        verb = "vence" if until >= 0 else "venció"
        text = f"Tu {label} ({mxn(amount)}) {verb} {_days(until) if until >= 0 else f'hace {-until} días'}"
        if until > 0:
            text += f": reserva {mxn(reserve)} diarios"
        out.append({
            "kind": "recurring_proposal", "key": label, "label": label, "period": period,
            "amount_cents": amount, "next_due": due.isoformat(), "days_until": until,
            "daily_reserve_cents": reserve, "occurrences": len(items), "text": text,
            "data_used": _used(items), "missing_data": [], "demo_data": _demo(items),
        })
    return sorted(out, key=lambda p: (p["next_due"], p["key"]))


def _growth(groups: dict[str, list[dict]], today: date) -> list[dict]:
    out = []
    for label, items in sorted(groups.items()):
        last = [i for i in items if today - timedelta(days=7) < i["day"] <= today]
        prev = [i for i in items if today - timedelta(days=14) < i["day"] <= today - timedelta(days=7)]
        a, b = sum(i["amount_cents"] for i in last), sum(i["amount_cents"] for i in prev)
        if b > 0 and (a - b) * 100 > b * TOLERANCE_PCT:
            pct = (a - b) * 100 // b
            out.append({
                "kind": "growing_expense", "label": label, "change_pct": pct,
                "period": "últimos 7 días vs. los 7 anteriores",
                "text": f"El gasto en {label} subió {pct} % vs. la semana pasada",
                "data_used": _used(prev + last), "missing_data": [], "demo_data": _demo(prev + last),
            })
    return out


def recommendations(conn: sqlite3.Connection, business_id: str, today: date | None = None) -> dict:
    """Read-only on data: proposals are computed, never stored until the owner decides."""
    today = _today(today)
    _ensure(conn)
    groups = _groups(conn, business_id, today)
    decided = {r["key"]: r for r in conn.execute("SELECT * FROM recurring_decisions WHERE business_id = ?", (business_id,))}
    proposals = [p for p in _proposals(groups, today) if p["key"] not in decided]
    commitments = []
    for r in decided.values():
        if r["status"] != "confirmed":
            continue
        until = (date.fromisoformat(r["next_due"]) - today).days
        commitments.append({
            "key": r["key"], "label": r["label"], "period": r["period"], "amount_cents": r["amount_cents"],
            "next_due": r["next_due"], "days_until": until,
            "daily_reserve_cents": -(-r["amount_cents"] // max(until, 1)),
        })
    commitments.sort(key=lambda c: (c["next_due"], c["key"]))
    total = sum(len(v) for v in groups.values())
    margin = {
        "kind": "best_margin", "period": "últimos 30 días",
        "text": "Para decirte qué producto te deja mejor margen necesito el precio y el costo de cada producto.",
        "data_used": [{"fuente": "gastos registrados", "cantidad": total}],
        "missing_data": ["precio por producto", "costo variable por producto"],
        "demo_data": any(_demo(v) for v in groups.values()),
    }
    return {
        "business_id": business_id, "as_of": today.isoformat(), "demo_data": margin["demo_data"],
        "recommendations": [*proposals, *_growth(groups, today), margin], "commitments": commitments,
    }


def decide(conn: sqlite3.Connection, business_id: str, key: str, decision: str, today: date | None = None) -> bool:
    """Confirm or dismiss a pending proposal. False when the key is not a pending proposal."""
    today = _today(today)
    _ensure(conn)
    pending = {p["key"]: p for p in recommendations(conn, business_id, today)["recommendations"] if p["kind"] == "recurring_proposal"}
    if key not in pending or decision not in ("confirm", "dismiss"):
        return False
    p = pending[key]
    conn.execute(
        "INSERT INTO recurring_decisions (business_id, key, status, label, period, amount_cents, next_due, decided_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (business_id, key, "confirmed" if decision == "confirm" else "dismissed", p["label"], p["period"],
         p["amount_cents"], p["next_due"], datetime.now(TZ).isoformat()),
    )
    conn.commit()
    return True
