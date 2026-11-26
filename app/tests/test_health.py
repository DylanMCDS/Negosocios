from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok() -> None:
    client = TestClient(create_app(web_dist=None))
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_serves_web_index_at_root(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<html><body>negosocios-root</body></html>")
    client = TestClient(create_app(web_dist=tmp_path))
    assert "negosocios-root" in client.get("/").text
    assert client.get("/api/health").json() == {"status": "ok"}


def test_config_reads_env(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app.config import get_settings

    monkeypatch.setenv("PEY_API_KEY", "k")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://x.test")
    monkeypatch.delenv("DATABASE_PATH", raising=False)
    settings = get_settings()
    assert settings.pey_api_key == "k"
    assert settings.public_base_url == "https://x.test"
    assert settings.database_path == "data/negosocios.db"
