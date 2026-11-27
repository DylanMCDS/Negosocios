"""Startup bootstrap: make sure the demo business exists on an empty database."""
import json
from pathlib import Path

from app.db import connect, init_db

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "demo_day.json"


def ensure_demo_business(database_path: str) -> bool:
    """Create the demo business from the fixture if missing. Never overwrites; returns True if created."""
    business = json.loads(FIXTURE.read_text(encoding="utf-8"))["business"]
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(path)
    try:
        init_db(conn)
        cursor = conn.execute(
            "INSERT OR IGNORE INTO businesses (id, name, category, zone, temporary_location, location_expires_at, demo_data)"
            " VALUES (:id, :name, :category, :zone, :temporary_location, :location_expires_at, 1)",
            business,
        )
        conn.commit()
        return cursor.rowcount == 1
    finally:
        conn.close()
