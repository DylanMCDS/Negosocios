from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.routers.network import get_now
from app.services.network import seed_demo_network

NOW = datetime(2026, 11, 23, 18, tzinfo=UTC)  # Monday noon in Mexico City.
SCHEDULE = {"mon": {"open": "09:00", "close": "18:00"}}


def profile(lat=19.4, lng=-99.13, **extra):
    return {"lat": lat, "lng": lng, "schedule": SCHEDULE, **extra}


@pytest.fixture
def api(tmp_path, monkeypatch):
    path = str(tmp_path / "network.db")
    monkeypatch.setenv("DATABASE_PATH", path)
    application = create_app(web_dist=None)
    application.dependency_overrides[get_now] = lambda: NOW
    with TestClient(application) as client:
        conn = connect(path)
        init_db(conn)
        for identifier in ["start", "near", "far"]:
            conn.execute("INSERT INTO businesses(id,name,category,zone) VALUES (?,?,?,?)",
                         (identifier, identifier, "Fixture", "Zona de prueba"))
        conn.commit()
        conn.close()
        for identifier, lat in [("start", 19.4), ("near", 19.401), ("far", 19.41)]:
            assert client.put(f"/api/network/{identifier}", json=profile(lat)).status_code == 200
        yield client, path


def search(client, **extra):
    return client.get("/api/network", params={
        "lat": 19.4, "lng": -99.13, "radius_km": 2, "category": "Fixture", **extra,
    })


def test_lists_businesses_sorted_by_distance(api):
    client, _ = api
    response = search(client)
    assert response.status_code == 200
    rows = response.json()
    assert [row["business_id"] for row in rows] == ["start", "near", "far"]
    assert [row["distance_km"] for row in rows] == sorted(row["distance_km"] for row in rows)
    assert rows[0]["distance_km"] == 0
    assert rows[1]["distance_km"] == pytest.approx(0.111, abs=0.002)
    assert len(search(client, radius_km=0.2).json()) == 2
    assert rows[0]["verified"] is False
    assert rows[0]["verification_text"] == "No verificado"
    assert rows[0]["rating"] is None and rows[0]["rating_count"] == 0


def test_filters_by_category_and_open_now(api):
    client, path = api
    client.put("/api/network/near", json=profile(19.401, schedule={}))
    conn = connect(path)
    conn.execute("UPDATE businesses SET category='Otro' WHERE id='far'")
    conn.commit()
    conn.close()
    assert [p["business_id"] for p in search(client, open_now=True).json()] == ["start"]
    assert [p["business_id"] for p in search(client, open_now=False).json()] == ["near"]
    assert search(client, category="Inexistente").json() == []


def test_expired_temporary_location_is_not_current(api):
    client, _ = api
    client.put("/api/network/start", json=profile(temporary_location={
        "lat": 20, "lng": -100, "expires_at": "2026-11-23T17:59:59Z",
    }))
    row = client.get("/api/network/start").json()
    assert row["temporary_current"] is False
    assert (row["lat"], row["lng"]) == (19.4, -99.13)
    assert row["temporary_expires_at"] is None
    assert search(client).json()[0]["business_id"] == "start"


def test_active_temporary_location_controls_distance_and_can_be_removed(api):
    client, _ = api
    temporary = {"lat": 20.00049, "lng": -100.00049, "expires_at": "2026-11-23T19:00:00Z"}
    response = client.put("/api/network/start", json=profile(temporary_location=temporary))
    assert response.status_code == 200
    row = response.json()
    assert row["temporary_current"] is True
    assert (row["lat"], row["lng"]) == (20, -100)
    assert "start" not in [p["business_id"] for p in search(client).json()]
    row = client.put("/api/network/start", json=profile(temporary_location=None)).json()
    assert row["temporary_current"] is False
    assert row["lat"] == 19.4


def test_overnight_hours_use_previous_mexico_city_day(api):
    client, _ = api
    client.put("/api/network/start", json=profile(schedule={"sun": {"open": "22:00", "close": "02:00"}}))
    client.app.dependency_overrides[get_now] = lambda: datetime(2026, 11, 23, 7, tzinfo=UTC)
    assert client.get("/api/network/start").json()["open_now"] is True
    client.app.dependency_overrides[get_now] = lambda: datetime(2026, 11, 23, 8, tzinfo=UTC)
    assert client.get("/api/network/start").json()["open_now"] is False


def test_seeds_demo_network_once(tmp_path, monkeypatch):
    path = str(tmp_path / "seed.db")
    monkeypatch.setenv("DATABASE_PATH", path)
    application = create_app(web_dist=None)
    with TestClient(application) as client:
        response = client.get("/api/network", params={"lat": 19.432, "lng": -99.133, "radius_km": 10})
        assert response.status_code == 200
        rows = response.json()
        assert 8 <= len(rows) <= 10
        assert all(p["demo_data"] for p in rows)
        assert all(not p["verified"] and p["rating"] is None for p in rows)
        identifier = rows[0]["business_id"]
        assert client.put(f"/api/network/{identifier}", json=profile(19.5)).status_code == 200
        seed_demo_network(path)
        seed_demo_network(path)
        conn = connect(path)
        try:
            assert conn.execute("SELECT COUNT(*) FROM network_profiles").fetchone()[0] == len(rows)
        finally:
            conn.close()
        assert client.get(f"/api/network/{identifier}").json()["lat"] == 19.5


def test_profile_coordinates_follow_publication_precision(api):
    client, path = api
    rounded = client.put("/api/network/start", json=profile(19.40049, -99.13049)).json()
    assert (rounded["lat"], rounded["lng"]) == (19.4, -99.13)
    exact = client.put("/api/network/start", json=profile(19.40049, -99.13049, location_precision="exact")).json()
    assert (exact["lat"], exact["lng"]) == (19.40049, -99.13049)
    assert exact["location_precision"] == "exact"
    conn = connect(path)
    try:
        assert conn.execute("SELECT lat FROM network_profiles WHERE business_id='start'").fetchone()[0] == 19.40049
    finally:
        conn.close()


@pytest.mark.parametrize("extra", [
    {"lat": 91}, {"lng": -181}, {"verified": True}, {"rating": 5},
    {"schedule": {"mon": {"open": "25:00", "close": "18:00"}}},
    {"temporary_location": {"lat": 20, "lng": -100, "expires_at": "2026-11-23T19:00:00"}},
])
def test_rejects_invalid_or_server_owned_profile_fields(api, extra):
    client, _ = api
    assert client.put("/api/network/start", json=profile(**extra)).status_code == 422


def test_unknown_profile_and_invalid_search(api):
    client, _ = api
    assert client.get("/api/network/missing").status_code == 404
    assert client.put("/api/network/missing", json=profile()).status_code == 404
    assert search(client, radius_km=-1).status_code == 422
    assert search(client, lat=91).status_code == 422
