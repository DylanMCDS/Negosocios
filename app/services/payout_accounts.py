"""Receiving account per business: simulated in the prototype, ready for pey's bankAccountId.

Only the bank (from the first 3 CLABE digits) and the last 4 digits are ever stored.
db.py and the schemas belong to other tasks, so this service owns its two tables.
"""
import re
import sqlite3
from datetime import UTC, datetime

BANKS = {
    "002": "Banamex", "012": "BBVA México", "014": "Santander", "021": "HSBC", "030": "BanBajío",
    "036": "Inbursa", "042": "Mifel", "044": "Scotiabank", "058": "Banregio", "062": "Afirme",
    "072": "Banorte", "127": "Banco Azteca", "137": "BanCoppel", "138": "Ualá",
    "659": "ASP Integra", "646": "STP", "722": "Mercado Pago W",
}
_WEIGHTS = ((3, 7, 1) * 6)[:17]
MODES = ("simulated", "pey")
SIMULATED = "simulada"
DIRECT = "directa"
PENDING_NOTE = "liquidación pendiente al negocio"


def check_digit(first17: str) -> int:
    """Official CLABE check digit: weights 3-7-1 over 17 digits, each product mod 10."""
    total = sum((int(d) * w) % 10 for d, w in zip(first17, _WEIGHTS, strict=True))
    return (10 - total % 10) % 10


def validate_clabe(clabe: str) -> tuple[str, str]:
    """Return (bank, last4) or raise ValueError with a message the owner can act on."""
    clabe = (clabe or "").strip()
    if not re.fullmatch(r"\d{18}", clabe):
        raise ValueError("La CLABE debe tener exactamente 18 dígitos")
    if check_digit(clabe[:17]) != int(clabe[17]):
        raise ValueError("CLABE inválida: el dígito de control no coincide; revisa que la escribiste completa")
    return BANKS.get(clabe[:3], f"Banco {clabe[:3]}"), clabe[-4:]


def ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS payout_accounts ("
        " business_id TEXT PRIMARY KEY REFERENCES businesses(id), bank TEXT NOT NULL, last4 TEXT NOT NULL,"
        " mode TEXT NOT NULL CHECK (mode IN ('simulated', 'pey')), pey_bank_account_id TEXT, updated_at TEXT NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS order_settlements ("
        " order_id TEXT PRIMARY KEY REFERENCES orders(id), settlement TEXT NOT NULL CHECK (settlement IN ('simulada', 'directa')))"
    )


def public_view(row: sqlite3.Row) -> dict:
    simulated = row["mode"] != "pey"
    return {
        "business_id": row["business_id"], "bank": row["bank"], "last4": row["last4"], "mode": row["mode"],
        "pey_bank_account_id": row["pey_bank_account_id"], "simulated": simulated,
        "label": "cuenta simulada" if simulated else "cuenta real",
    }


def get(conn: sqlite3.Connection, business_id: str) -> dict | None:
    ensure_tables(conn)
    row = conn.execute("SELECT * FROM payout_accounts WHERE business_id = ?", (business_id,)).fetchone()
    return public_view(row) if row else None


def save(conn: sqlite3.Connection, business_id: str, clabe: str, mode: str = "simulated",
         pey_bank_account_id: str | None = None) -> dict:
    """Validate and store bank + last 4 only. Raises ValueError for the 422 message."""
    bank, last4 = validate_clabe(clabe)
    if mode not in MODES:
        raise ValueError("El modo debe ser 'simulated' o 'pey'")
    pey_id = (pey_bank_account_id or "").strip() or None
    if mode == "pey" and pey_id is None:
        raise ValueError("El modo 'pey' requiere pey_bank_account_id (alta de cuenta en pey con codiStatus ACTIVE)")
    ensure_tables(conn)
    conn.execute(
        "INSERT INTO payout_accounts (business_id, bank, last4, mode, pey_bank_account_id, updated_at)"
        " VALUES (?, ?, ?, ?, ?, ?)"
        " ON CONFLICT(business_id) DO UPDATE SET bank = excluded.bank, last4 = excluded.last4, mode = excluded.mode,"
        " pey_bank_account_id = excluded.pey_bank_account_id, updated_at = excluded.updated_at",
        (business_id, bank, last4, mode, pey_id if mode == "pey" else None, datetime.now(UTC).isoformat()),
    )
    conn.commit()
    return get(conn, business_id)  # type: ignore[return-value]


def real_bank_account_id(conn: sqlite3.Connection, business_id: str) -> str | None:
    """pey's bankAccountId when the business collects for real; None means the platform account."""
    ensure_tables(conn)
    row = conn.execute(
        "SELECT pey_bank_account_id FROM payout_accounts WHERE business_id = ? AND mode = 'pey'", (business_id,)
    ).fetchone()
    return row["pey_bank_account_id"] if row else None


def record_settlement(conn: sqlite3.Connection, order_id: str, bank_account_id: str | None) -> None:
    """Inside the caller's transaction: no commit here."""
    conn.execute(
        "INSERT OR IGNORE INTO order_settlements (order_id, settlement) VALUES (?, ?)",
        (order_id, DIRECT if bank_account_id else SIMULATED),
    )


def settlement_for(conn: sqlite3.Connection, order_id: str) -> dict | None:
    ensure_tables(conn)
    row = conn.execute("SELECT settlement FROM order_settlements WHERE order_id = ?", (order_id,)).fetchone()
    if row is None:
        # Orders created before this table existed collected on the platform account.
        exists = conn.execute("SELECT 1 FROM orders WHERE id = ?", (order_id,)).fetchone()
        if exists is None:
            return None
        settlement = SIMULATED
    else:
        settlement = row["settlement"]
    note = PENDING_NOTE if settlement == SIMULATED else "cobro directo a la cuenta del negocio"
    return {"order_id": order_id, "settlement": settlement, "note": note}
