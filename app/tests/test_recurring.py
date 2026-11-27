from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.services import recurring

TODAY = date(2026, 11, 26)


@pytest.fixture
def conn(tmp_path, monkeypatch):
    path = tmp_path / "r.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    c = connect(path)
    init_db(c)
    c.execute("INSERT INTO businesses (id, name, category, zone) VALUES ('rosa', 'Rosa', 'Tacos', 'Z')")
    c.commit()
    yield c
    c.close()


def _expense(conn, eid, description, cents, day, category="Puesto"):
    conn.execute(
        "INSERT INTO expenses (id, business_id, amount_cents, category, date, description) VALUES (?, 'rosa', ?, ?, ?, ?)",
        (eid, cents, category, day, description),
    )
    conn.commit()


def _by_kind(result, kind):
    return [r for r in result["recommendations"] if r["kind"] == kind]


def test_detects_monthly_rent_after_three_payments(conn):
    _expense(conn, "a", "Renta del local", 120000, "2026-09-01")
    _expense(conn, "b", "Renta del local", 120000, "2026-10-01")
    two = recurring.recommendations(conn, "rosa", TODAY)
    assert _by_kind(two, "recurring_proposal") == []  # two payments are not a pattern
    _expense(conn, "c", "Renta del local", 120000, "2026-11-01")
    out = recurring.recommendations(conn, "rosa", TODAY)
    (rent,) = _by_kind(out, "recurring_proposal")
    assert rent["period"] == "monthly"
    assert rent["amount_cents"] == 120000
    assert rent["next_due"] == "2026-12-01"
    assert rent["days_until"] == 5
    assert rent["daily_reserve_cents"] == 24000  # $240 a day for 5 days, integer centavos
    assert "$240" in rent["text"] and "5 días" in rent["text"]


def test_detects_weekly_and_ignores_irregular(conn):
    for i, day in enumerate(["2026-10-29", "2026-11-05", "2026-11-12", "2026-11-19"]):
        _expense(conn, f"h{i}", "Hielo", 4500 + i * 100, day, "Insumos")
    for i, day in enumerate(["2026-10-01", "2026-11-03", "2026-11-04"]):
        _expense(conn, f"x{i}", "Propina", 1000, day)
    out = recurring.recommendations(conn, "rosa", TODAY)
    periods = {r["label"]: r["period"] for r in _by_kind(out, "recurring_proposal")}
    assert periods == {"hielo": "weekly"}


def test_does_not_commit_without_confirmation(conn):
    recurring.seed_history(conn, "rosa", TODAY)
    first = recurring.recommendations(conn, "rosa", TODAY)
    again = recurring.recommendations(conn, "rosa", TODAY)
    assert first == again  # reading never changes anything
    assert first["commitments"] == []
    assert conn.execute("SELECT COUNT(*) FROM recurring_decisions").fetchone()[0] == 0
    rent = next(r for r in _by_kind(first, "recurring_proposal") if r["period"] == "monthly")
    assert recurring.decide(conn, "rosa", rent["key"], "confirm", TODAY) is True
    after = recurring.recommendations(conn, "rosa", TODAY)
    assert [c["key"] for c in after["commitments"]] == [rent["key"]]
    assert rent["key"] not in [r.get("key") for r in _by_kind(after, "recurring_proposal")]
    gas = next(r for r in _by_kind(after, "recurring_proposal") if r["label"] == "gas")
    assert recurring.decide(conn, "rosa", gas["key"], "dismiss", TODAY) is True
    final = recurring.recommendations(conn, "rosa", TODAY)
    assert gas["key"] not in [r.get("key") for r in _by_kind(final, "recurring_proposal")]
    assert len(final["commitments"]) == 1  # dismissing does not create a commitment
    assert recurring.decide(conn, "rosa", "no-such-key", "confirm", TODAY) is False


def test_recommendation_lists_used_and_missing_data(conn):
    recurring.seed_history(conn, "rosa", TODAY)
    out = recurring.recommendations(conn, "rosa", TODAY)
    assert out["recommendations"]
    for r in out["recommendations"]:
        assert r["period"]
        assert isinstance(r["data_used"], list) and r["data_used"]
        assert isinstance(r["missing_data"], list)
    (margin,) = _by_kind(out, "best_margin")
    assert margin["missing_data"]  # no per-product cost or price is stored: say so, invent no figure
    assert "amount_cents" not in margin


def test_flags_growing_expense(conn):
    recurring.seed_history(conn, "rosa", TODAY)
    out = recurring.recommendations(conn, "rosa", TODAY)
    (growth,) = _by_kind(out, "growing_expense")
    assert growth["label"] == "tortillas"
    assert growth["change_pct"] == 18
    assert "18 %" in growth["text"]


def test_seed_history_is_idempotent(conn):
    assert recurring.seed_history(conn, "rosa", TODAY) > 0
    n = conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0]
    assert recurring.seed_history(conn, "rosa", TODAY) == 0
    assert conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0] == n
    assert conn.execute("SELECT COUNT(*) FROM expenses WHERE demo_data = 0").fetchone()[0] == 0


def test_endpoints_propose_then_confirm(conn, monkeypatch):
    recurring.seed_history(conn, "rosa", TODAY)
    client = TestClient(create_app(web_dist=None))
    got = client.get("/api/recommendations", params={"business_id": "rosa", "as_of": "2026-11-26"}).json()
    rent = next(r for r in got["recommendations"] if r["kind"] == "recurring_proposal" and r["period"] == "monthly")
    assert got["commitments"] == []
    bad = client.post("/api/recommendations/decision", json={"business_id": "rosa", "key": "nope", "decision": "confirm"})
    assert bad.status_code == 404
    ok = client.post(
        "/api/recommendations/decision",
        params={"as_of": "2026-11-26"},
        json={"business_id": "rosa", "key": rent["key"], "decision": "confirm"},
    )
    assert ok.status_code == 200
    again = client.get("/api/recommendations", params={"business_id": "rosa", "as_of": "2026-11-26"}).json()
    assert [c["key"] for c in again["commitments"]] == [rent["key"]]
    assert client.get("/api/recommendations", params={"business_id": "nadie"}).status_code == 404


def test_demo_history_endpoint_loads_labeled_history_once(conn):
    client = TestClient(create_app(web_dist=None))
    first = client.post("/api/recommendations/demo-history", params={"business_id": "rosa", "as_of": "2026-11-26"}).json()
    assert first["demo_data"] is True and first["inserted"] > 0
    second = client.post("/api/recommendations/demo-history", params={"business_id": "rosa", "as_of": "2026-11-26"}).json()
    assert second["inserted"] == 0
    got = client.get("/api/recommendations", params={"business_id": "rosa", "as_of": "2026-11-26"}).json()
    assert any(r["kind"] == "recurring_proposal" and r["period"] == "monthly" for r in got["recommendations"])
    assert client.post("/api/recommendations/demo-history", params={"business_id": "nadie"}).status_code == 404
