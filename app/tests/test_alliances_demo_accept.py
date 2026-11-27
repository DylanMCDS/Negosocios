import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.db import connect, init_db
from app.main import create_app
from app.services import alliances

ECONOMICS = {"price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000}


@pytest.fixture
def api(tmp_path, monkeypatch):
    # The demo business accepts after a few seconds; the test does not wait.
    monkeypatch.setattr(alliances, "DEMO_ACCEPT_SECONDS", 0)
    path = str(tmp_path / "demo_accept.db")
    settings = Settings(database_path=path)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    conn = connect(path)
    init_db(conn)
    rows = [("taqueria", 0), ("cafe_demo", 1), ("cafe_real", 0)]
    for bid, demo in rows:
        conn.execute(
            "INSERT INTO businesses (id, name, category, zone, demo_data) VALUES (?, ?, 'Comida', 'Centro', ?)",
            (bid, bid, demo),
        )
    conn.commit()
    with TestClient(application) as client:
        yield client
    conn.close()


def _propose(client, partner):
    response = client.post("/api/alliances", json={
        "business_a": "taqueria", "business_b": partner, "giver": "taqueria",
        "discount_pct": 10, "budget_cents": 10000, "max_uses": 5, **ECONOMICS,
    })
    assert response.status_code == 201
    return response.json()


def _status(client, alliance_id):
    items = client.get("/api/alliances", params={"business_id": "taqueria"}).json()
    return next(item for item in items if item["id"] == alliance_id)


def test_proposal_to_demo_business_is_auto_accepted(api):
    alliance = _propose(api, "cafe_demo")
    seen = _status(api, alliance["id"])
    assert seen["status"] == "active"
    assert seen["demo"] is True


def test_proposal_to_real_business_stays_pending(api):
    alliance = _propose(api, "cafe_real")
    seen = _status(api, alliance["id"])
    assert seen["status"] == "proposal"
    assert seen["demo"] is False
