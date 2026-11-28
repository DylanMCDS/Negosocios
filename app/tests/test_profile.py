import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app
from app.routers.network import get_now as network_now
from app.routers.profile import get_now
from app.services import payout_accounts

NOW = datetime(2026, 11, 23, 18, tzinfo=UTC)
SCHEDULE = {"mon": {"open": "09:00", "close": "18:00"}}
FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "population"
PUBLIC_FIELDS = {"business_id", "name", "category", "zone", "description", "cover", "menu", "whatsapp",
                 "schedule", "open_now", "demo_data", "promotions", "allies", "reputation", "reviews"}


def editable(**extra):
    return {"description": "Comida recién hecha", "cover": "maiz", "menu": [
        {"name": "Taco", "price_cents": 2500, "featured": True}], "whatsapp": "525512345678",
        "schedule": SCHEDULE, **extra}


@pytest.fixture
def api(tmp_path, monkeypatch):
    path = str(tmp_path / "profile.db")
    monkeypatch.setenv("DATABASE_PATH", path)
    app = create_app(web_dist=None)
    app.dependency_overrides[get_settings] = lambda: Settings(database_path=path)
    app.dependency_overrides[get_now] = lambda: NOW
    app.dependency_overrides[network_now] = lambda: NOW
    conn = connect(path)
    init_db(conn)
    for bid in ("shop", "ally"):
        conn.execute("INSERT INTO businesses(id,name,category,zone) VALUES (?,?, 'Tacos','Centro')", (bid, bid))
    conn.commit()
    with TestClient(app) as client:
        yield client, conn
    conn.close()


def test_profile_roundtrip_saves_menu_and_description(api):
    client, conn = api
    saved = client.put("/api/profile/shop", json=editable())
    assert saved.status_code == 200
    assert saved.json().get("description") == "Comida recién hecha"
    assert {k: saved.json()[k] for k in editable()} == editable()
    assert set(saved.json()) == PUBLIC_FIELDS
    assert saved.json()["open_now"] is True
    assert saved.json()["demo_data"] is False
    assert client.get("/api/profile/shop").json() == saved.json()
    assert conn.execute("SELECT COUNT(*) FROM public_business_profiles WHERE business_id='shop'").fetchone()[0] == 1


def test_profile_never_exposes_clabe(api):
    client, conn = api
    payout_accounts.ensure_tables(conn)
    conn.execute("INSERT INTO payout_accounts VALUES ('shop','BANK','1234','pey','private-account','now')")
    conn.commit()
    assert client.put("/api/network/shop", json={"lat": 19.432123, "lng": -99.133456,
        "location_precision": "exact", "schedule": SCHEDULE}).status_code == 200
    response = client.get("/api/profile/shop")
    assert response.status_code == 200
    assert set(response.json()) == PUBLIC_FIELDS
    assert not any(word in response.text for word in ("clabe", "private-account", "1234", "19.432123", "-99.133456",
        "payout", "cost_cents", "budget_cents", "order_id", "address"))


def test_demo_businesses_have_profiles(api):
    client, conn = api
    businesses = json.loads((FIXTURES / "businesses.json").read_text())
    assert len(businesses) == 36
    for business in businesses:
        conn.execute("INSERT INTO businesses(id,name,category,zone,demo_data) VALUES (?,?,?,?,1)",
                     (business["id"], business["name"], business["category"], business["zone"]))
    conn.commit()
    fixture = json.loads((FIXTURES / "profiles.json").read_text())
    assert {row["business_id"] for row in fixture} == {row["id"] for row in businesses}
    for business in businesses:
        response = client.get(f"/api/profile/{business['id']}")
        assert response.status_code == 200
        page = response.json()
        assert page["demo_data"] is True
        assert page["description"] and page["cover"] in ("toldo", "maiz", "cafe", "flores")
        assert page["schedule"] == business["schedule"]
        assert [{k: item[k] for k in ("name", "price_cents")} for item in page["menu"]] == [
            {k: item[k] for k in ("name", "price_cents")} for item in business["products"]]
        assert set(page) == PUBLIC_FIELDS


def test_profile_unknown_is_404(api):
    client, _ = api
    assert client.get("/api/profile/missing").status_code == 404
    assert client.put("/api/profile/missing", json=editable()).status_code == 404


@pytest.mark.parametrize("extra", [
    {"description": "x" * 301}, {"cover": "http://example.org/image"}, {"whatsapp": "+525512345678"},
    {"whatsapp": "1" * 9}, {"whatsapp": "1" * 16}, {"menu": [{"name": "x", "price_cents": True}]},
    {"menu": [{"name": "x", "price_cents": 1.2}]}, {"menu": [{"name": "x", "price_cents": "200"}]},
    {"menu": [{"name": "x", "price_cents": -1}]}, {"menu": [{"name": "x", "price_cents": 100000001}]},
    {"menu": [{"name": "x" * 81, "price_cents": 1}]}, {"menu": [{"name": "x", "price_cents": 1}] * 21},
    {"menu": [{"name": "x", "price_cents": 1, "cost_cents": 1}]}, {"demo_data": True},
    {"reputation": {"rating": 5}}, {"name": "fake"}, {"clabe": "private"}, {"lat": 19.4},
    {"schedule": {"monday": None}}, {"schedule": {"mon": {"open": "25:00", "close": "18:00"}}},
])
def test_profile_rejects_invalid_and_readonly_fields(api, extra):
    client, _ = api
    assert client.put("/api/profile/shop", json=editable(**extra)).status_code == 422


def test_profile_repeated_put_is_single_atomic_row(api):
    client, conn = api
    for description in ("Primero", "Segundo", "Segundo"):
        assert client.put("/api/profile/shop", json=editable(description=description)).status_code == 200
    assert client.get("/api/profile/shop").json()["description"] == "Segundo"
    assert conn.execute("SELECT COUNT(*) FROM public_business_profiles WHERE business_id='shop'").fetchone()[0] == 1


def test_profile_seed_preserves_edits_and_real_business(api):
    client, conn = api
    demo, real = json.loads((FIXTURES / "businesses.json").read_text())[:2]
    for b, flag in ((demo, 1), (real, 0)):
        conn.execute("INSERT INTO businesses(id,name,category,zone,demo_data) VALUES (?,?,?,?,?)",
                     (b["id"], b["name"], b["category"], b["zone"], flag))
    conn.commit()
    target = f"/api/profile/{demo['id']}"
    assert client.put(target, json=editable(description="Mi edición")).status_code == 200
    assert client.get(target).json()["description"] == "Mi edición"
    assert client.get(target).json()["description"] == "Mi edición"
    real_page = client.get(f"/api/profile/{real['id']}").json()
    assert real_page["description"] == "" and real_page["menu"] == [] and real_page["demo_data"] is False


def test_profile_schedule_stays_consistent_with_explore(api):
    client, _ = api
    assert client.put("/api/network/shop", json={"lat": 19.4, "lng": -99.13, "schedule": SCHEDULE}).status_code == 200
    assert client.put("/api/profile/shop", json=editable(schedule={})).status_code == 200
    network = client.get("/api/network/shop").json()
    page = client.get("/api/profile/shop").json()
    assert page["schedule"] == network["schedule"] == {}
    assert page["open_now"] is network["open_now"] is False
    assert client.put("/api/network/shop", json={"lat": 19.4, "lng": -99.13, "schedule": SCHEDULE}).status_code == 200
    assert client.get("/api/profile/shop").json()["schedule"] == SCHEDULE
    assert client.get("/api/profile/shop").json()["open_now"] is True


def test_profile_public_reviews_and_active_alliance_allowlist(api):
    client, conn = api
    conn.execute("INSERT INTO orders(id,business_id,amount_cents,concept,status,idempotency_key,created_at) "
                 "VALUES ('private-order','shop',100,'x','paid','private-key','2026-11-23')")
    conn.commit()
    review = client.post("/api/reviews", json={"order_id": "private-order", "stars": 4, "text": "Rico"})
    assert review.status_code == 201
    data = {"business_a": "ally", "business_b": "shop", "giver": "shop", "discount_pct": 10,
            "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000,
            "budget_cents": 5000, "max_uses": 5}
    alliance = client.post("/api/alliances", json=data).json()
    before = client.get("/api/profile/shop").json()
    assert before["promotions"] == before["allies"] == []
    assert client.post(f"/api/alliances/{alliance['id']}/accept").status_code == 200
    page = client.get("/api/profile/shop").json()
    assert page["reputation"] == {"rating": 4, "reviews_count": 1, "endorsements": 1}
    assert page["reviews"] == [{k: review.json()[k] for k in ("id", "stars", "text", "created_at")}]
    assert page["allies"] == [{"business_id": "ally", "name": "ally", "discount_pct": 10}]
    assert len(page["promotions"]) == 1
    assert set(page["promotions"][0]) == {"id", "title", "discount_pct"}
    assert page["promotions"][0]["id"] == alliance["id"]
    assert "private-order" not in json.dumps(page) and "budget_cents" not in json.dumps(page)


@pytest.mark.parametrize("exhaustion", ["uses=max_uses", "budget_used_cents=budget_cents", "budget_used_cents=4500"])
def test_profile_hides_offers_without_remaining_uses_or_budget(api, exhaustion):
    client, conn = api
    alliance = client.post("/api/alliances", json={
        "business_a": "ally", "business_b": "shop", "giver": "shop", "discount_pct": 10,
        "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000,
        "budget_cents": 5000, "max_uses": 5}).json()
    assert client.post(f"/api/alliances/{alliance['id']}/accept").status_code == 200
    assert len(client.get("/api/profile/shop").json()["promotions"]) == 1
    conn.execute(f"UPDATE alliances SET {exhaustion} WHERE id = ?", (alliance["id"],))
    conn.commit()
    page = client.get("/api/profile/shop").json()
    assert page["promotions"] == page["allies"] == []


def test_profile_and_directory_schedule_rollback_together(api):
    client, conn = api
    assert client.put("/api/network/shop", json={"lat": 19.4, "lng": -99.13, "schedule": SCHEDULE}).status_code == 200
    assert client.put("/api/profile/shop", json=editable()).status_code == 200
    conn.execute("""CREATE TRIGGER reject_directory_update BEFORE UPDATE OF schedule ON network_profiles
        BEGIN SELECT RAISE(ABORT, 'schedule storage failed'); END""")
    conn.commit()
    with pytest.raises(Exception, match="schedule storage failed"):
        client.put("/api/profile/shop", json=editable(description="No guardar", schedule={}))
    page = client.get("/api/profile/shop").json()
    assert page["description"] == "Comida recién hecha"
    assert page["schedule"] == client.get("/api/network/shop").json()["schedule"] == SCHEDULE
