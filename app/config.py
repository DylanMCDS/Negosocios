from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Server-side settings read from the process environment only (never from client code)."""

    pey_api_key: str = ""
    pey_webhook_secret: str = ""
    database_path: str = "data/negosocios.db"
    public_base_url: str = "http://localhost:8000"


def get_settings() -> Settings:
    return Settings()
