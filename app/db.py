"""SQLite schema only; callers own transactions and payment reconciliation."""
import sqlite3
from os import PathLike


def connect(path: str | PathLike[str]) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Initialize before serving requests; executescript commits pending transactions."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS businesses (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL, category TEXT NOT NULL, zone TEXT NOT NULL,
            temporary_location TEXT, location_expires_at TEXT,
            demo_data INTEGER NOT NULL DEFAULT 0 CHECK (demo_data IN (0, 1))
        );
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY NOT NULL,
            business_id TEXT NOT NULL REFERENCES businesses(id),
            amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents > 0),
            currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
            concept TEXT NOT NULL CHECK (length(concept) BETWEEN 1 AND 40),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
            idempotency_key TEXT NOT NULL, codi_qr_id TEXT UNIQUE, qr_string TEXT,
            created_at TEXT NOT NULL, expires_at TEXT, paid_at TEXT,
            reconciliation_required INTEGER NOT NULL DEFAULT 0 CHECK (reconciliation_required IN (0, 1)),
            reconciliation_reason TEXT,
            demo_data INTEGER NOT NULL DEFAULT 0 CHECK (demo_data IN (0, 1)),
            UNIQUE (business_id, idempotency_key)
        );
        CREATE TABLE IF NOT EXISTS webhook_events (
            webhook_id TEXT PRIMARY KEY NOT NULL,
            order_id TEXT REFERENCES orders(id), event_type TEXT,
            received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY NOT NULL,
            order_id TEXT NOT NULL REFERENCES orders(id),
            codi_qr_id TEXT NOT NULL, transaction_id TEXT NOT NULL UNIQUE,
            webhook_id TEXT NOT NULL UNIQUE REFERENCES webhook_events(webhook_id),
            amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents > 0),
            currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
            paid_at TEXT NOT NULL,
            demo_data INTEGER NOT NULL DEFAULT 0 CHECK (demo_data IN (0, 1))
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY NOT NULL,
            business_id TEXT NOT NULL REFERENCES businesses(id),
            amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents > 0),
            currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
            category TEXT NOT NULL, date TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('voice', 'manual')),
            description TEXT NOT NULL DEFAULT '',
            demo_data INTEGER NOT NULL DEFAULT 0 CHECK (demo_data IN (0, 1))
        );
    """)
