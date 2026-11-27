import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app


@pytest.fixture
def api(tmp_path):
    path = str(tmp_path / "reviews.db")
    settings = Settings(database_path=path)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    conn = connect(path)
    init_db(conn)
    for bid in ("taqueria", "cafe"):
        conn.execute("INSERT INTO businesses (id, name, category, zone) VALUES (?, ?, 'Comida', 'Centro')", (bid, bid))
    for oid, status in (("1", "paid"), ("2", "pending"), ("3", "paid")):
        conn.execute("INSERT INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, created_at)"
                     " VALUES (?, 'taqueria', 5000, 'x', ?, ?, '2026-11-26T10:00:00-06:00')", (oid, status, f"k{oid}"))
    conn.commit()
    with TestClient(application) as client:
        yield client, conn
    conn.close()


def test_review_requires_paid_order(api):
    client, _ = api
    assert client.post("/api/reviews", json={"order_id": "2", "stars": 5, "text": "rico"}).status_code == 409
    assert client.post("/api/reviews", json={"order_id": "nope", "stars": 5}).status_code == 404
    assert client.post("/api/reviews", json={"order_id": "1", "stars": 6}).status_code == 422
    assert client.post("/api/reviews", json={"order_id": "1", "stars": 0}).status_code == 422
    ok = client.post("/api/reviews", json={"order_id": "1", "stars": 4, "text": "rico"})
    assert ok.status_code == 201 and ok.json()["stars"] == 4
    assert client.post("/api/reviews", json={"order_id": "1", "stars": 5}).status_code == 409  # one per order


def test_alliances_do_not_raise_star_rating(api):
    client, _ = api
    client.post("/api/reviews", json={"order_id": "1", "stars": 4})
    client.post("/api/reviews", json={"order_id": "3", "stars": 3})
    before = client.get("/api/businesses/taqueria/reputation").json()
    assert before == {"rating": 3.5, "reviews_count": 2, "endorsements": 0}
    alliance = client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "taqueria", "discount_pct": 10, "budget_cents": 5000,
        "max_uses": 5, "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000}).json()
    client.post(f"/api/alliances/{alliance['id']}/accept")
    after = client.get("/api/businesses/taqueria/reputation").json()
    assert after == {"rating": 3.5, "reviews_count": 2, "endorsements": 1}
    assert client.get("/api/businesses/cafe/reputation").json() == {"rating": None, "reviews_count": 0, "endorsements": 1}
    assert client.get("/api/businesses/ghost/reputation").status_code == 404
