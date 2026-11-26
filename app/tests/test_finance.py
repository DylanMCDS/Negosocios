from app.services.finance import closing, max_discount


def test_max_discount_keeps_min_contribution():
    r = max_discount(10000, 6000, 3000)
    assert r["ok"] is True
    assert r["max_discount_pct"] == 10.0
    assert r["message"] is None


def test_max_discount_reports_price_already_below_target():
    r = max_discount(10000, 6000, 5000)
    assert r["ok"] is False
    assert r["max_discount_pct"] is None
    assert r["message"] == "el precio actual ya incumple la meta"


def test_closing_counts_only_paid_orders():
    sales = [
        {"id": "a", "status": "paid", "amount_cents": 10000},
        {"id": "b", "status": "paid", "amount_cents": 5000},
        {"id": "c", "status": "pending", "amount_cents": 7000},
        {"id": "d", "status": "expired", "amount_cents": 9000},
    ]
    expenses = [{"amount_cents": 4000}]
    r = closing(sales, expenses)
    assert r["confirmed_sales_cents"] == 15000
    assert r["expenses_cents"] == 4000
    assert r["estimated_profit_cents"] == 11000
    assert r["currency"] == "MXN"


def test_closing_lists_pending_orders_separately():
    sales = [
        {"id": "a", "status": "paid", "amount_cents": 10000},
        {"id": "c", "status": "pending", "amount_cents": 7000},
    ]
    r = closing(sales, [{"amount_cents": 1000}])
    assert [o["id"] for o in r["pending"]] == ["c"]
    assert r["pending_cents"] == 7000
    assert r["confirmed_sales_cents"] == 10000


def test_closing_flags_missing_costs():
    r = closing([{"id": "a", "status": "paid", "amount_cents": 10000}], [])
    assert "expenses" in r["missing"]
    r2 = closing([], [{"amount_cents": 100}])
    assert "sales" in r2["missing"]
    assert closing([{"id": "a", "status": "paid", "amount_cents": 1}], [{"amount_cents": 1}])["missing"] == []
