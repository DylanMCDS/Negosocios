import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app

BANAMEX = "002010077777777771"  # valid CLABE (check digit 1)


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_path=str(tmp_path / "multi.db"))
    application = create_app(web_dist=None)
    application.dependency_overrides[get_settings] = lambda: settings
    with TestClient(application) as c:
        yield c


def create(client, name):
    return client.post("/api/businesses", json={"name": name, "category": "Tacos", "zone": "Tianguis"})


def test_can_register_a_second_business(client):
    first, second = create(client, "Tacos de Rosa"), create(client, "Barbería Lalo")
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert client.get(f"/api/businesses/{second.json()['id']}").json()["name"] == "Barbería Lalo"


def test_same_clabe_allowed_in_two_businesses(client):
    ids = [create(client, n).json()["id"] for n in ("Tacos de Rosa", "Jugos de Rosa")]
    for business_id in ids:
        res = client.put(f"/api/businesses/{business_id}/payout-account", json={"clabe": BANAMEX})
        assert res.status_code in (200, 201), res.text
