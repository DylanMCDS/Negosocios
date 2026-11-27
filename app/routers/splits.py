from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.routers.orders import get_pey_client
from app.services import splits
from app.services.orders import database, find_order
from app.services.pey import PeyClient

router = APIRouter()


class SplitIn(BaseModel):
    parts: int | None = None
    amounts_cents: list[int] | None = None


@router.post("/api/orders/{order_id}/split", status_code=201)
def split_order(
    order_id: str, body: SplitIn,
    settings: Annotated[Settings, Depends(get_settings)],
    pey: Annotated[PeyClient, Depends(get_pey_client)],
) -> dict:
    with database(settings.database_path) as conn:
        return splits.create_split(conn, order_id, body.parts, body.amounts_cents, pey)


@router.get("/api/orders/{order_id}/split")
def get_split(order_id: str, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    with database(settings.database_path) as conn:
        find_order(conn, order_id)
        found = splits.get_split(conn, order_id)
    if found is None:
        raise HTTPException(404, "La orden no está dividida")
    return found
