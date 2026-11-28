from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from app.tests.test_alliances import api as api, active
from app.routers.coupons import get_now

NOW = datetime(2026, 11, 28, 18, tzinfo=UTC)


def paid(conn, identifier="receipt", business="taqueria", status="paid"):
    conn.execute("""INSERT INTO orders(id,business_id,amount_cents,concept,status,idempotency_key,created_at,demo_data)
        VALUES (?,?,10000,'Compra',?,?,?,1)""", (identifier, business, status, "key-" + identifier, NOW.isoformat()))
    conn.commit()


def claim(client, alliance, order_id="receipt"):
    client.app.dependency_overrides[get_now] = lambda: NOW
    return client.post("/api/coupons/claim", json={"alliance_id": alliance["id"], "business_id": "taqueria", "order_id": order_id})


def redeem(client, token, key="next", business="cafe", amount=10000):
    return client.post(f"/api/coupons/{token}/redeem", json={"business_id": business, "order_id": key, "amount_cents": amount})


def coupon(api, **economics):
    client, conn = api
    alliance = active(client, **economics)
    paid(conn)
    response = claim(client, alliance)
    assert response.status_code == 201
    return response.json()["token"], alliance


def test_claim_requires_paid_order_at_issuing_business(api):
    client, conn = api
    alliance = active(client)
    assert claim(client, alliance).status_code == 409
    paid(conn, status="pending")
    assert claim(client, alliance).status_code == 409
    paid(conn, "foreign", business="cafe")
    assert claim(client, alliance, "foreign").status_code == 409
    paid(conn, "eligible")
    issued = claim(client, alliance, "eligible")
    assert issued.status_code == 201
    assert len(issued.json()["token"]) >= 32
    assert claim(client, alliance, "eligible").status_code == 409


def test_coupon_is_single_use(api):
    client, conn = api
    token, alliance = coupon(api)
    assert redeem(client, token).status_code == 200
    assert redeem(client, token, key="another").status_code == 409
    assert client.get(f"/api/coupons/{token}").json()["status"] == "used"
    assert conn.execute("SELECT uses FROM alliances WHERE id=?", (alliance["id"],)).fetchone()[0] == 1


def test_coupon_only_valid_at_partner_business(api):
    client, _ = api
    token, _ = coupon(api)
    response = redeem(client, token, business="taqueria")
    assert response.status_code == 409
    assert "negocio" in response.json()["detail"]
    assert redeem(client, token).json()["total_cents"] == 9000


def test_coupon_expires_after_seven_days(api):
    client, _ = api
    token, _ = coupon(api)
    assert client.get(f"/api/coupons/{token}").json()["expires_at"] == (NOW + timedelta(days=7)).isoformat()
    client.app.dependency_overrides[get_now] = lambda: NOW + timedelta(days=7)
    assert client.get(f"/api/coupons/{token}").json()["status"] == "expired"
    assert redeem(client, token).status_code == 409


def test_redeem_respects_budget_and_one_benefit_per_order(api):
    client, conn = api
    first, alliance = coupon(api, budget_cents=1500)
    paid(conn, "second")
    second = claim(client, alliance, "second").json()["token"]
    assert redeem(client, first).json()["discount_cents"] == 1000
    assert redeem(client, second).status_code == 409
    response = redeem(client, second, key="other-order")
    assert response.status_code == 409
    assert "presupuesto" in response.json()["detail"].lower()
    assert client.get(f"/api/coupons/{second}").json()["status"] == "valid"
    row = conn.execute("SELECT uses,budget_used_cents FROM alliances WHERE id=?", (alliance["id"],)).fetchone()
    assert tuple(row) == (1, 1000)


def test_redeem_is_idempotent_for_same_order(api):
    client, conn = api
    token, _ = coupon(api, max_uses=1)
    first = redeem(client, token)
    assert first.status_code == 200
    assert first.json() == redeem(client, token).json()
    assert redeem(client, token, amount=20000).status_code == 409
    # A successfully created discounted QR can later be referenced by its database id.
    conn.execute("""INSERT INTO orders(id,business_id,amount_cents,concept,status,idempotency_key,created_at,demo_data,codi_qr_id)
        VALUES ('created','cafe',9000,'Compra','pending','next',?,1,'demo-qr')""", (NOW.isoformat(),))
    conn.commit()
    assert first.json() == redeem(client, token, key="created").json()
    client.app.dependency_overrides[get_now] = lambda: NOW + timedelta(days=8)
    assert first.json() == redeem(client, token).json()


def test_coupon_view_never_exposes_sensitive_data(api):
    client, _ = api
    token, _ = coupon(api)
    view = client.get(f"/api/coupons/{token}").json()
    assert view["status"] == "valid"
    assert view["issuer"] == {"id": "taqueria", "name": "taqueria"}
    assert view["redeem_at"] == {"id": "cafe", "name": "cafe"}
    assert view["discount_pct"] == 10
    assert view["demo_data"] is True
    assert set(view) == {"token", "alliance_id", "status", "issuer", "redeem_at", "discount_pct", "expires_at", "demo_data"}
    assert "receipt" not in str(view)
    assert client.get("/api/coupons/unknown").status_code == 404


def test_claim_and_redeem_are_serialized_under_concurrency(api):
    client, conn = api
    alliance = active(client, max_uses=1)
    paid(conn)
    with ThreadPoolExecutor(6) as pool:
        results = list(pool.map(lambda _: claim(client, alliance), range(6)))
    assert sorted(r.status_code for r in results) == [201, 409, 409, 409, 409, 409]
    token = next(r.json()["token"] for r in results if r.status_code == 201)
    with ThreadPoolExecutor(6) as pool:
        results = list(pool.map(lambda i: redeem(client, token, key=f"race-{i}"), range(6)))
    assert sorted(r.status_code for r in results) == [200, 409, 409, 409, 409, 409]
    assert tuple(conn.execute("SELECT uses,budget_used_cents FROM alliances WHERE id=?", (alliance["id"],)).fetchone()) == (1, 1000)


def test_point_claim_needs_unclaimed_paid_order_and_active_point(api):
    client, conn = api
    alliance = active(client)
    client.app.dependency_overrides[get_now] = lambda: NOW
    point = client.post("/api/points", json={"business_id": "taqueria", "kind": "entrance", "label": "Entrada"}).json()
    body = {"alliance_id": alliance["id"], "point_id": point["id"]}
    assert client.post("/api/coupons/claim", json=body).status_code == 409
    paid(conn)
    assert client.post("/api/coupons/claim", json=body).status_code == 201
    assert client.post("/api/coupons/claim", json=body).status_code == 409
    client.delete(f'/api/points/{point["id"]}')
    assert client.post("/api/coupons/claim", json=body).status_code == 410


def test_redeem_does_not_rewrite_existing_qr_or_spend_on_failure(api):
    client, conn = api
    token, alliance = coupon(api)
    paid(conn, "full-qr", business="cafe", status="pending")
    conn.execute("UPDATE orders SET codi_qr_id='real-qr',demo_data=0 WHERE id='full-qr'")
    conn.commit()
    assert redeem(client, token, key="full-qr").status_code == 409
    assert conn.execute("SELECT amount_cents FROM orders WHERE id='full-qr'").fetchone()[0] == 10000
    assert tuple(conn.execute("SELECT uses,budget_used_cents FROM alliances WHERE id=?", (alliance["id"],)).fetchone()) == (0, 0)
    assert client.get(f"/api/coupons/{token}").json()["status"] == "valid"


def test_redeem_enforces_use_limit_and_integer_discount(api):
    client, conn = api
    token, alliance = coupon(api, max_uses=1)
    paid(conn, "second")
    second = claim(client, alliance, "second").json()["token"]
    result = redeem(client, token, amount=101).json()
    assert result["discount_cents"] == 10
    assert result["total_cents"] == 91
    response = redeem(client, second, key="other")
    assert response.status_code == 409
    assert "usos" in response.json()["detail"].lower()


def test_existing_legacy_benefit_blocks_coupon_without_spending_it(api):
    client, conn = api
    token, _ = coupon(api)
    legacy = client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "cafe",
        "discount_pct": 10, "budget_cents": 10000, "max_uses": 5,
        "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000,
    }).json()
    client.post(f'/api/alliances/{legacy["id"]}/accept')
    assert client.post(f'/api/alliances/{legacy["id"]}/quote', json={"order_id": "next", "amount_cents": 10000}).json()["applied"] is True
    assert redeem(client, token).status_code == 409
    assert client.get(f"/api/coupons/{token}").json()["status"] == "valid"


def test_coupons_from_different_alliances_cannot_stack_on_one_order(api):
    client, conn = api
    token, _ = coupon(api)
    second_alliance = active(client)
    paid(conn, "second-receipt")
    other = claim(client, second_alliance, "second-receipt").json()["token"]
    assert redeem(client, token).status_code == 200
    assert redeem(client, other).status_code == 409
    assert client.get(f"/api/coupons/{other}").json()["status"] == "valid"


def test_coupon_reservation_can_create_discounted_order_without_changing_qr(api):
    from app.services.orders import create_order, database
    from app.services.pey import FakePeyClient
    from app.schemas import OrderCreate
    client, conn = api
    token, _ = coupon(api)
    result = redeem(client, token).json()
    with database(str(conn.execute("PRAGMA database_list").fetchone()["file"])) as db:
        order, created = create_order(db, OrderCreate(business_id="cafe", amount_cents=result["total_cents"], concept="Compra con cupón"), "next", FakePeyClient())
    assert created is True
    assert order.amount_cents == 9000
    assert redeem(client, token, key=order.id).json() == result


def test_claim_schema_rejects_missing_paid_proof(api):
    client, _ = api
    alliance = active(client)
    assert client.post("/api/coupons/claim", json={"alliance_id": alliance["id"], "business_id": "taqueria"}).status_code == 422
    assert redeem(client, "unknown", amount=True).status_code == 422


def test_redeem_rejects_ambiguous_order_id_and_key(api):
    client, conn = api
    token, _ = coupon(api)
    for identifier, key in (("ambiguous", "first-key"), ("other-id", "ambiguous")):
        conn.execute("""INSERT INTO orders(id,business_id,amount_cents,concept,status,idempotency_key,created_at)
            VALUES (?,'cafe',9000,'Compra','pending',?,?)""", (identifier, key, NOW.isoformat()))
    conn.commit()
    assert redeem(client, token, key="ambiguous").status_code == 409
    assert client.get(f"/api/coupons/{token}").json()["status"] == "valid"


def test_redeem_rejects_existing_paid_and_expired_orders(api):
    client, conn = api
    token, alliance = coupon(api)
    paid(conn, "paid-target", "cafe", "paid")
    paid(conn, "expired-target", "cafe", "pending")
    conn.execute("UPDATE orders SET amount_cents=9000 WHERE business_id='cafe'")
    conn.execute("UPDATE orders SET expires_at=? WHERE id='expired-target'", ((NOW - timedelta(seconds=1)).isoformat(),))
    conn.commit()
    for identifier in ("paid-target", "expired-target"):
        assert redeem(client, token, key=identifier).status_code == 409
    assert client.get(f"/api/coupons/{token}").json()["status"] == "valid"
    assert tuple(conn.execute("SELECT uses,budget_used_cents FROM alliances WHERE id=?", (alliance["id"],)).fetchone()) == (0, 0)


def test_coupon_reservation_blocks_later_legacy_code(api):
    client, _ = api
    token, _ = coupon(api)
    legacy = client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "cafe",
        "discount_pct": 10, "budget_cents": 10000, "max_uses": 5,
        "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000,
    }).json()
    client.post(f'/api/alliances/{legacy["id"]}/accept')
    assert redeem(client, token).status_code == 200
    response = client.post(f'/api/alliances/{legacy["id"]}/quote', json={"order_id": "next", "amount_cents": 10000})
    assert response.status_code == 409
    assert "cupón" in response.json()["detail"]


def test_coupon_and_legacy_code_concurrent_reservations_allow_one_benefit(api):
    client, conn = api
    token, coupon_alliance = coupon(api)
    legacy = client.post("/api/alliances", json={
        "business_a": "cafe", "business_b": "taqueria", "giver": "cafe",
        "discount_pct": 10, "budget_cents": 10000, "max_uses": 5,
        "price_cents": 10000, "variable_cost_cents": 6000, "min_contribution_cents": 3000,
    }).json()
    client.post(f'/api/alliances/{legacy["id"]}/accept')
    with ThreadPoolExecutor(2) as pool:
        coupon_result = pool.submit(redeem, client, token)
        legacy_result = pool.submit(client.post, f'/api/alliances/{legacy["id"]}/quote', json={"order_id": "next", "amount_cents": 10000})
        responses = [coupon_result.result(), legacy_result.result()]
    assert sorted(response.status_code for response in responses) == [200, 409]
    rows = conn.execute("SELECT SUM(uses),SUM(budget_used_cents) FROM alliances WHERE id IN (?,?)",
                        (coupon_alliance["id"], legacy["id"])).fetchone()
    assert tuple(rows) == (1, 1000)
