"""Public prototype directory. Coordinates are published with explicit precision.

The prototype has no authenticated business owners; PUT must be protected before
production owner-only editing. Verification and ratings cannot be self-asserted.
"""
import json
import math
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import Field, field_validator

from app.schemas import Contract
from app.services.orders import database

Latitude = Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
Longitude = Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
ClockTime = Annotated[str, Field(pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$")]
DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
MEXICO = ZoneInfo("America/Mexico_City")
FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "network_demo.json"
COLUMNS = ("business_id", "lat", "lng", "location_precision", "schedule", "accepts_codi",
           "temporary_lat", "temporary_lng", "temporary_expires_at", "demo_data")


class Hours(Contract):
    open: ClockTime
    close: ClockTime


class TemporaryLocation(Contract):
    lat: Latitude
    lng: Longitude
    expires_at: datetime

    @field_validator("expires_at")
    @classmethod
    def require_timezone(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("La expiración requiere zona horaria")
        return value


class ProfileUpdate(Contract):
    lat: Latitude
    lng: Longitude
    location_precision: Literal["exact", "approximate"] = "approximate"
    schedule: dict[Weekday, Hours | None] = Field(default_factory=dict)
    accepts_codi: bool = True
    temporary_location: TemporaryLocation | None = None


@contextmanager
def network_db(path):
    with database(path) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS network_profiles (
            business_id TEXT PRIMARY KEY REFERENCES businesses(id),
            lat REAL NOT NULL, lng REAL NOT NULL,
            location_precision TEXT NOT NULL,
            schedule TEXT NOT NULL, accepts_codi INTEGER NOT NULL,
            verified INTEGER NOT NULL DEFAULT 0,
            verification_text TEXT NOT NULL DEFAULT 'No verificado',
            temporary_lat REAL, temporary_lng REAL, temporary_expires_at TEXT,
            demo_data INTEGER NOT NULL DEFAULT 0
        )""")
        yield conn


def _store(conn, business_id, body, demo_data, *, overwrite):
    def coordinate(value):
        return round(value, 3) if body.location_precision == "approximate" else value
    temporary = body.temporary_location
    values = (
        business_id, coordinate(body.lat), coordinate(body.lng), body.location_precision,
        json.dumps(body.model_dump(mode="json")["schedule"]), body.accepts_codi,
        coordinate(temporary.lat) if temporary else None,
        coordinate(temporary.lng) if temporary else None,
        temporary.expires_at.isoformat() if temporary else None, demo_data,
    )
    conflict = "DO NOTHING"
    if overwrite:
        conflict = "DO UPDATE SET " + ",".join(f"{name}=excluded.{name}" for name in COLUMNS[1:-1])
    conn.execute(
        f"INSERT INTO network_profiles ({','.join(COLUMNS)}) VALUES ({','.join('?' for _ in COLUMNS)}) "
        f"ON CONFLICT(business_id) {conflict}", values,
    )


def seed_demo_network(path: str):
    """Nine synthetic directory entries; existing profiles and edits always win."""
    records = json.loads(FIXTURE.read_text())
    with network_db(path) as conn, conn:
        for record in records:
            conn.execute("""INSERT INTO businesses(id,name,category,zone,demo_data)
                VALUES (?,?,?,?,1) ON CONFLICT(id) DO NOTHING""",
                (record["business_id"], record["name"], record["category"], record["zone"]))
            body = ProfileUpdate.model_validate(record["profile"])
            _store(conn, record["business_id"], body, True, overwrite=False)


def _is_open(schedule, now):
    """Missing days and equal open/close times mean closed; overnight spans midnight."""
    local = now.astimezone(MEXICO)
    minute = local.hour * 60 + local.minute
    def interval(day):
        hours = schedule.get(DAYS[day % 7])
        if not hours:
            return None
        return tuple(int(value[:2]) * 60 + int(value[3:]) for value in (hours["open"], hours["close"]))
    today, previous = interval(local.weekday()), interval(local.weekday() - 1)
    if today:
        start, end = today
        if (start < end and start <= minute < end) or (start > end and minute >= start):
            return True
    return bool(previous and previous[0] > previous[1] and minute < previous[1])


def _distance(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(math.radians, (lat1, lng1, lat2, lng2))
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, max(0, a))))


def _public(row, now):
    expires = datetime.fromisoformat(row["temporary_expires_at"]) if row["temporary_expires_at"] else None
    current = bool(expires and expires > now)
    schedule = json.loads(row["schedule"])
    return {
        "business_id": row["business_id"], "name": row["name"], "category": row["category"],
        "zone": row["zone"], "lat": row["temporary_lat"] if current else row["lat"],
        "lng": row["temporary_lng"] if current else row["lng"],
        "location_precision": row["location_precision"], "schedule": schedule,
        "accepts_codi": bool(row["accepts_codi"]), "verified": bool(row["verified"]),
        "verification_text": row["verification_text"], "rating": None, "rating_count": 0,
        "distance_km": None, "open_now": _is_open(schedule, now),
        "temporary_current": current, "temporary_expires_at": expires.isoformat() if current else None,
        "demo_data": bool(row["demo_data"]),
    }


SELECT = """SELECT p.*, b.name, b.category, b.zone FROM network_profiles p
    JOIN businesses b ON b.id = p.business_id"""


def get_profile(path, business_id, now):
    with network_db(path) as conn:
        row = conn.execute(SELECT + " WHERE p.business_id = ?", (business_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Perfil no encontrado")
        return _public(row, now)


def save_profile(path, business_id, body, now):
    with network_db(path) as conn:
        business = conn.execute("SELECT demo_data FROM businesses WHERE id = ?", (business_id,)).fetchone()
        if business is None:
            raise HTTPException(404, "Negocio no encontrado")
        with conn:
            _store(conn, business_id, body, business["demo_data"], overwrite=True)
    return get_profile(path, business_id, now)


def list_profiles(path, lat, lng, radius_km, category, open_now, now):
    with network_db(path) as conn:
        rows = conn.execute(SELECT).fetchall()
    results = []
    for row in rows:
        item = _public(row, now)
        distance = _distance(lat, lng, item["lat"], item["lng"])
        if distance > radius_km or (category is not None and item["category"].casefold() != category.casefold()):
            continue
        if open_now is not None and item["open_now"] != open_now:
            continue
        item["distance_km"] = distance
        results.append(item)
    return sorted(results, key=lambda item: (item["distance_km"], item["business_id"]))
