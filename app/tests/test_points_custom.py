from app.tests.test_points import api, order, link, BUSINESS
from app.db import connect

def custom(client, **kwargs):
    return client.post("/api/points", json={"business_id": BUSINESS, "kind": "table", "label": "Terraza", "icon": "plant", "target": "assigned", **kwargs})

def test_point_accepts_custom_name_icon_and_target(api):
    client, _ = api
    response = custom(client)
    assert response.status_code == 201
    created = response.json()
    assert (created["label"], created["icon"], created["target"]) == ("Terraza", "plant", "assigned")
    assert client.get("/api/points", params={"business_id": BUSINESS}).json()["points"][0]["icon"] == "plant"
    assert custom(client, icon="invalid").status_code == 422
    assert custom(client, target="https://foreign.test").status_code == 422

def test_entrance_target_opens_business_profile(api):
    client, _ = api
    response = custom(client, kind="entrance", target="profile")
    assert response.status_code == 201
    created = response.json()
    assert client.get(f'/api/points/{created["id"]}/resolve').json()["url"] == f"/#perfil/{BUSINESS}"
    assert client.get(created["path"], follow_redirects=False).headers["location"] == f"/#perfil/{BUSINESS}"

def test_point_list_shows_assigned_order_status(api):
    client, path = api
    created = custom(client).json()
    assert "id" in created
    order(path, "mesa")
    link(client, created["id"], "mesa")
    def assigned():
        return client.get("/api/points", params={"business_id": BUSINESS}).json()["points"][0]["assigned_orders"]
    assert assigned()[0]["status"] == "pending"
    assert assigned()[0]["amount_cents"] == 3550
    with connect(path) as conn:
        conn.execute("UPDATE orders SET status='paid' WHERE id='mesa'")
        conn.commit()
    assert assigned()[0]["status"] == "paid"
    resolved = client.get(f'/api/points/{created["id"]}/resolve').json()
    assert resolved["mode"] == "empty"
    assert "assigned_orders" not in resolved["point"]

def test_current_target_opens_latest_business_charge_without_assignment(api):
    client, path = api
    created = custom(client, target="current").json()
    assert "id" in created
    order(path, "old", minutes_ago=2)
    order(path, "new")
    assert client.get(created["path"], follow_redirects=False).headers["location"] == "/pagar/new"


def test_explicit_target_takes_precedence_and_preserves_order_boundaries(api):
    client, path = api
    created = custom(client, kind="entrance", target="assigned").json()
    assert "id" in created
    order(path, "mine")
    order(path, "foreign", business_id="rosa")
    order(path, "paid", status="paid")
    link(client, created["id"], "mine")
    for identifier in ("foreign", "paid"):
        assert client.post(f'/api/points/{created["id"]}/orders', json={"order_id": identifier}).status_code in (404, 409)
    assert client.get(created["path"], follow_redirects=False).headers["location"] == "/pagar/mine"
    profile = custom(client, kind="table", target="profile").json()
    assert client.post(f'/api/points/{profile["id"]}/orders', json={"order_id": "mine"}).status_code == 409
    client.delete(f'/api/points/{created["id"]}')
    assert client.get(f'/api/points/{created["id"]}/resolve').status_code == 410


def test_existing_database_upgrade_is_idempotent_and_preserves_assignments(api):
    client, path = api
    # Recreate the schema that shipped before icon/target existed.
    with connect(path) as conn:
        conn.execute("CREATE TABLE points (id TEXT PRIMARY KEY, business_id TEXT, kind TEXT, label TEXT, active INTEGER DEFAULT 1)")
        conn.execute("CREATE TABLE point_orders (point_id TEXT, order_id TEXT, PRIMARY KEY(point_id,order_id))")
        conn.execute("INSERT INTO points(id,business_id,kind,label) VALUES ('legacy',?,'table','Mesa anterior')", (BUSINESS,))
        conn.commit()
    order(path, "retained")
    with connect(path) as conn:
        conn.execute("INSERT INTO point_orders VALUES ('legacy','retained')")
        conn.commit()
    for _ in range(2):
        listed = client.get("/api/points", params={"business_id": BUSINESS}).json()["points"][0]
        assert listed["label"] == "Mesa anterior"
        assert listed["icon"] == "pin"
        assert listed["assigned_orders"][0]["id"] == "retained"
        assert client.get("/p/legacy", follow_redirects=False).headers["location"] == "/pagar/retained"
