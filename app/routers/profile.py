from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.services import profile

router = APIRouter()


def get_now():
    return datetime.now(UTC)


@router.get("/api/profile/{business_id}")
def get_profile(business_id: str, settings: Annotated[Settings, Depends(get_settings)],
                now: Annotated[datetime, Depends(get_now)]):
    return profile.get_profile(settings.database_path, business_id, now)


@router.put("/api/profile/{business_id}")
def put_profile(business_id: str, body: profile.ProfileUpdate, settings: Annotated[Settings, Depends(get_settings)],
                now: Annotated[datetime, Depends(get_now)]):
    return profile.save_profile(settings.database_path, business_id, body, now)
