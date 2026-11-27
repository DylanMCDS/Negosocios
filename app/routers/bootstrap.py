from fastapi import APIRouter

from app.config import get_settings
from app.services.bootstrap import ensure_demo_business

router = APIRouter()


@router.on_event("startup")
def seed_demo_business() -> None:
    # Render wipes the SQLite file on each deploy: the Cobrar screen needs `rosa` to exist.
    ensure_demo_business(get_settings().database_path)
