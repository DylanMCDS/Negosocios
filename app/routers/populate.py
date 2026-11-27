import os

from fastapi import APIRouter

from app.config import get_settings
from app.services import populate

router = APIRouter()


@router.on_event("startup")
def populate_demo_network() -> None:
    """Carga la población demo al arrancar, una sola vez. Se activa con POPULATE_DEMO_DATA=1: el arranque por defecto
    no siembra ventas ni gastos (lo exige test_bootstrap.py)."""
    if os.getenv("POPULATE_DEMO_DATA", "").lower() in ("1", "true", "yes"):
        populate.populate(get_settings().database_path)
