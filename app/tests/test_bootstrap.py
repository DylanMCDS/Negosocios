import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.routers.orders import get_pey_client
from app.services.pey import FakePeyClient


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "fresh.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    return path


def _client():
    application = create_app(web_dist=None)
    application.dependency_overrides[get_pey_client] = lambda: FakePeyClient()
    return TestClient(application)


def test_creating_order_for_demo_business_works_on_empty_database(db_path):
    assert not db_path.exists()
    with _client() as client:
        r = client.post(
            "/api/orders",
            headers={"Idempotency-Key": "k1"},
            json={"business_id": "rosa", "amount_cents": 10000, "concept": "Orden de tacos"},
        )
        assert r.status_code == 201, r.text
        assert r.json()["business_id"] == "rosa"
        business = client.get("/api/businesses/rosa").json()
    assert business["name"] == "Tacos de Doña Rosa"
    conn = connect(db_path)
    # Only the business is created: sales and expenses stay in POST /api/demo/seed.
    assert conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0] == 0
    assert conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 1  # only the one just created
    conn.close()


def test_startup_does_not_duplicate_existing_business(db_path):
    conn = connect(db_path)
    init_db(conn)
    conn.execute(
        "INSERT INTO businesses (id, name, category, zone, demo_data) VALUES ('rosa', 'Nombre editado', 'Otro', 'Z', 0)"
    )
    conn.commit()
    conn.close()
    for _ in range(2):
        with _client():
            pass
    conn = connect(db_path)
    rows = conn.execute("SELECT name, demo_data FROM businesses WHERE id = 'rosa'").fetchall()
    conn.close()
    assert [tuple(r) for r in rows] == [("Nombre editado", 0)]
