"""Public business pages; banking, exact locations and alliance finances stay private."""
import json
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import HTTPException
from pydantic import Field

from app.schemas import Contract
from app.services import alliances, network, reviews

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "population" / "profiles.json"


class MenuItem(Contract):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    price_cents: Annotated[int, Field(strict=True, ge=0, le=100_000_000)]
    featured: Annotated[bool, Field(strict=True)] = False


class ProfileUpdate(Contract):
    description: Annotated[str, Field(max_length=300)] = ""
    cover: Literal["toldo", "maiz", "cafe", "flores"] = "toldo"
    menu: Annotated[list[MenuItem], Field(max_length=20)] = Field(default_factory=list)
    whatsapp: Annotated[str, Field(pattern=r"^[0-9]{10,15}$")] | None = None
    schedule: dict[network.Weekday, network.Hours | None] = Field(default_factory=dict)


def ensure_tables(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS public_business_profiles (
        business_id TEXT PRIMARY KEY REFERENCES businesses(id),
        profile TEXT NOT NULL
    )""")


@contextmanager
def profile_db(path):
    with network.network_db(path) as conn:
        reviews.ensure_all(conn)
        ensure_tables(conn)
        yield conn


def _business(conn, business_id):
    business = conn.execute("SELECT id,name,category,zone,demo_data FROM businesses WHERE id = ?",
                            (business_id,)).fetchone()
    if business is None:
        raise HTTPException(404, "Negocio no encontrado")
    return business


def _seed(conn, business):
    """Only actual demo businesses receive fixture data; saved edits always win."""
    if not business["demo_data"]:
        return
    for record in json.loads(FIXTURE.read_text(encoding="utf-8")):
        if record["business_id"] == business["id"]:
            body = ProfileUpdate.model_validate({key: record[key] for key in ProfileUpdate.model_fields})
            conn.execute("INSERT INTO public_business_profiles(business_id,profile) VALUES (?,?) "
                         "ON CONFLICT(business_id) DO NOTHING", (business["id"], body.model_dump_json()))
            return


def _offers(conn, business_id):
    rows = conn.execute("""SELECT a.id,a.giver,a.discount_pct,a.price_cents,a.budget_cents,a.budget_used_cents,
        b.id AS peer_id,b.name AS peer_name FROM alliances a JOIN businesses b
        ON b.id = CASE WHEN a.business_a = ? THEN a.business_b ELSE a.business_a END
        WHERE (a.business_a = ? OR a.business_b = ?) AND a.status = 'active' AND a.uses < a.max_uses
        ORDER BY a.id""", (business_id, business_id, business_id)).fetchall()
    promotions, peers = [], []
    for row in rows:
        discount = alliances._discount_cents(row["price_cents"], row["discount_pct"])
        if discount <= 0 or row["budget_used_cents"] + discount > row["budget_cents"]:
            continue
        peers.append({"business_id": row["peer_id"], "name": row["peer_name"], "discount_pct": row["discount_pct"]})
        if row["giver"] == business_id:
            promotions.append({"id": row["id"], "title": f"Descuento con {row['peer_name']}",
                               "discount_pct": row["discount_pct"]})
    return promotions, peers


def _public(conn, business, now):
    business_id = business["id"]
    stored = conn.execute("SELECT profile FROM public_business_profiles WHERE business_id = ?",
                          (business_id,)).fetchone()
    body = ProfileUpdate.model_validate_json(stored["profile"]) if stored else ProfileUpdate()
    editable = body.model_dump(mode="json")
    directory = conn.execute("SELECT schedule FROM network_profiles WHERE business_id = ?", (business_id,)).fetchone()
    if directory:
        editable["schedule"] = json.loads(directory["schedule"])
    promotions, peers = _offers(conn, business_id)
    public_reviews = conn.execute("""SELECT r.id,r.stars,r.text,r.created_at FROM reviews r
        JOIN orders o ON o.id = r.order_id WHERE o.business_id = ? ORDER BY r.created_at DESC,r.id""",
        (business_id,)).fetchall()
    return {
        "business_id": business_id, "name": business["name"], "category": business["category"],
        "zone": business["zone"], **editable, "open_now": network._is_open(editable["schedule"], now),
        "demo_data": bool(business["demo_data"]), "promotions": promotions, "allies": peers,
        "reputation": reviews.reputation(conn, business_id), "reviews": [dict(row) for row in public_reviews],
    }


def get_profile(path, business_id, now):
    with profile_db(path) as conn:
        business = _business(conn, business_id)
        with conn:
            _seed(conn, business)
        return _public(conn, business, now)


def save_profile(path, business_id, body, now):
    with profile_db(path) as conn:
        business = _business(conn, business_id)
        with conn:
            _seed(conn, business)
            conn.execute("INSERT INTO public_business_profiles(business_id,profile) VALUES (?,?) "
                         "ON CONFLICT(business_id) DO UPDATE SET profile=excluded.profile",
                         (business_id, body.model_dump_json()))
            conn.execute("UPDATE network_profiles SET schedule = ? WHERE business_id = ?",
                         (json.dumps(body.model_dump(mode="json")["schedule"]), business_id))
        return _public(conn, business, now)
