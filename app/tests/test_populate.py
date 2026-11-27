import json
import re
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.services import finance, populate

FIXTURES = Path(populate.__file__).resolve().parent.parent / "fixtures" / "population"
TODAY = date(2026, 11, 26)


@pytest.fixture
def db(tmp_path, monkeypatch):
    path = tmp_path / "pop.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    return path


def rows(path, sql, *args):
    conn = connect(path)
    try:
        return [dict(r) for r in conn.execute(sql, args)]
    finally:
        conn.close()


def one(path, sql, *args):
    return list(rows(path, sql, *args)[0].values())[0]


def test_populates_network_once_on_startup(db, monkeypatch):
    monkeypatch.setenv("POPULATE_DEMO_DATA", "1")  # the default boot stays empty (test_bootstrap.py); production sets this flag
    with TestClient(create_app(web_dist=None)):
        pass
    count = lambda t: one(db, f"SELECT COUNT(*) FROM {t}")
    businesses = one(db, "SELECT COUNT(*) FROM businesses WHERE id LIKE 'pop-%'")
    assert 30 <= businesses <= 40
    assert one(db, "SELECT COUNT(DISTINCT category) FROM businesses WHERE id LIKE 'pop-%'") >= 12
    assert one(db, "SELECT COUNT(DISTINCT zone) FROM businesses WHERE id LIKE 'pop-%'") >= 3
    assert 12 <= one(db, "SELECT COUNT(*) FROM alliances WHERE status = 'active'") <= 15
    before = {t: count(t) for t in ("businesses", "orders", "expenses", "alliances", "reviews", "network_profiles", "payout_accounts", "referrals")}
    assert all(v > 0 for v in before.values())
    with TestClient(create_app(web_dist=None)):  # second start: nothing is duplicated
        pass
    assert {t: count(t) for t in before} == before
    # verified seals are on about half of the profiles and say what was checked
    verified = one(db, "SELECT COUNT(*) FROM network_profiles p JOIN businesses b ON b.id = p.business_id WHERE b.id LIKE 'pop-%' AND p.verified = 1")
    assert businesses * 0.35 <= verified <= businesses * 0.65
    assert one(db, "SELECT COUNT(*) FROM network_profiles WHERE verified = 1 AND verification_text NOT LIKE 'Verificado:%'") == 0
    # Rosa, the demo business, is connected to the network.
    assert one(db, "SELECT COUNT(*) FROM alliances WHERE business_a = 'rosa' OR business_b = 'rosa'") >= 2
    assert one(db, "SELECT COUNT(*) FROM orders WHERE business_id = 'rosa' AND status = 'paid'") > 20


def test_does_not_overwrite_user_created_business(db):
    conn = connect(db)
    init_db(conn)
    conn.execute("INSERT INTO businesses (id, name, category, zone, demo_data) VALUES ('pop-fonda-01', 'Mi fonda real', 'Fonda', 'Mi zona', 0)")
    conn.commit()
    conn.close()
    populate.populate(str(db), today=TODAY)
    mine = rows(db, "SELECT * FROM businesses WHERE id = 'pop-fonda-01'")[0]
    assert (mine["name"], mine["zone"], mine["demo_data"]) == ("Mi fonda real", "Mi zona", 0)
    # nothing demo is attached to the real business
    assert one(db, "SELECT COUNT(*) FROM orders WHERE business_id = 'pop-fonda-01'") == 0
    assert one(db, "SELECT COUNT(*) FROM alliances WHERE business_a = 'pop-fonda-01' OR business_b = 'pop-fonda-01'") == 0
    assert one(db, "SELECT COUNT(*) FROM network_profiles WHERE business_id = 'pop-fonda-01'") == 0


def test_alliance_discounts_respect_max_discount(db):
    populate.populate(str(db), today=TODAY)
    alliances = rows(db, "SELECT * FROM alliances")
    assert len(alliances) >= 12
    for a in alliances:
        limit = finance.max_discount(a["price_cents"], a["variable_cost_cents"], a["min_contribution_cents"])
        assert limit["ok"] and a["discount_pct"] <= limit["max_discount_pct"], a["id"]
        floor_cents = int(a["price_cents"] * a["discount_pct"] / 100)
        assert floor_cents <= a["price_cents"] - a["variable_cost_cents"] - a["min_contribution_cents"]
        assert a["budget_used_cents"] <= a["budget_cents"] and a["uses"] <= a["max_uses"]
    assert one(db, "SELECT COUNT(*) FROM referrals") > 0


def test_reviews_only_on_paid_orders(db):
    populate.populate(str(db), today=TODAY)
    total = one(db, "SELECT COUNT(*) FROM reviews")
    assert total > 100
    assert one(db, "SELECT COUNT(*) FROM reviews r JOIN orders o ON o.id = r.order_id WHERE o.status <> 'paid'") == 0
    assert one(db, "SELECT COUNT(*) FROM reviews r LEFT JOIN orders o ON o.id = r.order_id WHERE o.id IS NULL") == 0
    assert one(db, "SELECT COUNT(*) FROM reviews WHERE stars NOT BETWEEN 1 AND 5") == 0
    high = one(db, "SELECT COUNT(*) FROM reviews WHERE stars >= 4")
    assert high / total >= 0.6  # a realistic distribution: most are 4-5 stars
    low = rows(db, "SELECT text FROM reviews WHERE stars <= 3")
    assert low and all(r["text"].strip() for r in low)  # low ratings explain themselves
    assert one(db, "SELECT MIN(date(paid_at)) FROM orders WHERE id LIKE '9%' AND status = 'paid'") <= "2026-10-20"  # about 6 weeks of history


def test_all_seeded_records_are_demo_data(db):
    populate.populate(str(db), today=TODAY)
    for table, key in (("businesses", "id LIKE 'pop-%'"), ("orders", "id >= '900000'"), ("expenses", "id LIKE 'pop-%'"), ("network_profiles", "business_id LIKE 'pop-%'")):
        assert one(db, f"SELECT COUNT(*) FROM {table} WHERE {key} AND demo_data = 0") == 0, table
        assert one(db, f"SELECT COUNT(*) FROM {table} WHERE {key}") > 0, table
    assert one(db, "SELECT COUNT(*) FROM payout_accounts WHERE mode <> 'simulated'") == 0
    for row in rows(db, "SELECT * FROM payout_accounts"):
        assert re.fullmatch(r"\d{4}", row["last4"])  # bank + last 4 only, never a full CLABE


def test_no_full_clabe_or_phone_in_fixtures():
    text = "\n".join(p.read_text(encoding="utf-8") for p in sorted(FIXTURES.glob("*.json")))
    assert text, "population fixtures are missing"
    assert not re.search(r"(?<!\d)\d{18}(?!\d)", text), "a full CLABE-like number"
    assert not re.search(r"(?<!\d)(?:\+?52)?\s?\d{2}[\s-]?\d{4}[\s-]?\d{4}(?!\d)", text), "a phone number"
    assert "lorem" not in text.lower() and "ipsum" not in text.lower()
    data = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(FIXTURES.glob("*.json"))]
    assert data
