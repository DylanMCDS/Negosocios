from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.config import Settings, get_settings
from app.services import network
from app.services.network import ProfileUpdate

router = APIRouter()


def get_now():
    return datetime.now(UTC)


@router.on_event("startup")
def seed_network():
    network.seed_demo_network(get_settings().database_path)


@router.get("/api/network")
def list_network(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    settings: Annotated[Settings, Depends(get_settings)],
    now: Annotated[datetime, Depends(get_now)],
    radius_km: Annotated[float, Query(ge=0, allow_inf_nan=False)] = 5,
    category: str | None = None, open_now: bool | None = None,
):
    return network.list_profiles(settings.database_path, lat, lng, radius_km, category, open_now, now)


@router.get("/api/network/{business_id}")
def get_profile(
    business_id: str, settings: Annotated[Settings, Depends(get_settings)],
    now: Annotated[datetime, Depends(get_now)],
):
    return network.get_profile(settings.database_path, business_id, now)


@router.put("/api/network/{business_id}")
def put_profile(
    business_id: str, body: ProfileUpdate,
    settings: Annotated[Settings, Depends(get_settings)], now: Annotated[datetime, Depends(get_now)],
):
    return network.save_profile(settings.database_path, business_id, body, now)
