from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse, RedirectResponse

from app.config import Settings, get_settings
from app.services import points
from app.services.points import PointCreate, PointOrder

router = APIRouter()
SPA_INDEX = Path(__file__).resolve().parents[2] / "web" / "dist" / "index.html"


def get_now():
    return datetime.now(UTC)


@router.post("/api/points", status_code=201)
def create_point(body: PointCreate, settings: Annotated[Settings, Depends(get_settings)],
                 now: Annotated[datetime, Depends(get_now)]):
    return points.create_point(settings.database_path, body, now)


@router.get("/api/points")
def list_points(business_id: Annotated[str, Query(min_length=1)],
                settings: Annotated[Settings, Depends(get_settings)], now: Annotated[datetime, Depends(get_now)]):
    return points.list_points(settings.database_path, business_id, now)


@router.get("/api/points/pending-orders")
def pending_orders(business_id: Annotated[str, Query(min_length=1)],
                   settings: Annotated[Settings, Depends(get_settings)], now: Annotated[datetime, Depends(get_now)]):
    return points.pending_orders(settings.database_path, business_id, now)


@router.post("/api/points/{point_id}/orders")
def attach_order(point_id: str, body: PointOrder, settings: Annotated[Settings, Depends(get_settings)],
                 now: Annotated[datetime, Depends(get_now)]):
    return points.link_order(settings.database_path, point_id, body.order_id, now)


@router.delete("/api/points/{point_id}")
def revoke_point(point_id: str, settings: Annotated[Settings, Depends(get_settings)],
                 now: Annotated[datetime, Depends(get_now)]):
    return points.revoke_point(settings.database_path, point_id, now)


@router.get("/api/points/{point_id}/resolve")
def resolve_point(point_id: str, response: Response, settings: Annotated[Settings, Depends(get_settings)],
                  now: Annotated[datetime, Depends(get_now)]):
    response.headers.update(points.NO_STORE)
    return points.resolve_point(settings.database_path, point_id, now)


@router.get("/p/{point_id}")
def open_point(point_id: str, settings: Annotated[Settings, Depends(get_settings)],
               now: Annotated[datetime, Depends(get_now)]):
    try:
        destination = points.resolve_point(settings.database_path, point_id, now)["url"]
    except HTTPException as error:
        if error.status_code not in (404, 410):
            raise
        destination = f"/#puntos/{quote(point_id, safe='')}"
    return RedirectResponse(destination, status_code=303, headers=points.NO_STORE)


@router.get("/pagar/{order_id}", include_in_schema=False)
def payment_screen(order_id: str):
    # StaticFiles does not serve SPA deep links. The existing Pagar component
    # reads this path and loads the order/receiver through its normal API.
    # The path parameter never selects a file: only this fixed shell is served.
    if not SPA_INDEX.is_file():
        raise HTTPException(503, "Esta pantalla no está disponible. Pide al negocio otro enlace.")
    return FileResponse(SPA_INDEX, headers=points.NO_STORE)
