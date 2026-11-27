import pytest
from fastapi.testclient import TestClient

from app.db import connect, init_db
from app.main import create_app
from app.services.voice_parse import parse_expense


def test_parses_amount_and_item_from_spanish_phrase():
    out = parse_expense("gasté 350 en tortillas")
    assert out == {"amount_cents": 35000, "category": "insumos", "description": "tortillas", "ambiguous": False}


@pytest.mark.parametrize("text,cents", [
    ("gasté 350 pesos en tortillas", 35000),
    ("pagué $350 de tortillas", 35000),
    ("gasté 35.50 en hielo", 3550),
    ("compré tortillas por 1,200 pesos", 120000),
])
def test_parses_amount_written_with_pesos_word(text, cents):
    out = parse_expense(text)
    assert out["amount_cents"] == cents
    assert out["ambiguous"] is False


@pytest.mark.parametrize("text,cents", [
    ("gasté trescientos cincuenta en tortillas", 35000),
    ("gasté doscientos pesos en gas", 20000),
    ("gasté ochenta y cinco pesos en hielo", 8500),
    ("gasté quinientos en tortillas", 50000),
    ("gasté cien pesos en tortillas", 10000),
    ("gasté ciento veinte en tortillas", 12000),
    ("gasté mil doscientos en renta", 120000),
])
def test_parses_amount_in_words(text, cents):
    assert parse_expense(text)["amount_cents"] == cents


@pytest.mark.parametrize("text", [
    "compré tortillas",
    "gasté 350 en tortillas y 200 en gas",
    "",
])
def test_flags_ambiguous_amount(text):
    out = parse_expense(text)
    assert out["ambiguous"] is True
    assert out["amount_cents"] is None


def test_parse_endpoint_does_not_save_expense(tmp_path, monkeypatch):
    path = tmp_path / "t.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    conn = connect(path)
    init_db(conn)
    client = TestClient(create_app(web_dist=None))
    r = client.post("/api/expenses/parse", json={"text": "gasté 350 en tortillas"})
    assert r.status_code == 200
    assert r.json() == {"amount_cents": 35000, "category": "insumos", "description": "tortillas", "ambiguous": False}
    assert conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0] == 0
    conn.close()
