from datetime import datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import Field

from app.config import Settings, get_settings
from app.schemas import Business, Contract
from app.services.orders import database, find_business

router = APIRouter()


class BusinessCreate(Contract):
    name: Annotated[str, Field(min_length=1)]
    category: Annotated[str, Field(min_length=1)]
    zone: Annotated[str, Field(min_length=1)]
    temporary_location: str | None = None
    location_expires_at: datetime | None = None


@router.post("/api/businesses", status_code=201, response_model=Business)
def create_business(body: BusinessCreate, settings: Annotated[Settings, Depends(get_settings)]):
    business = Business(id=str(uuid4()), **body.model_dump())
    values = business.model_dump(mode="json")
    columns = list(values)
    with database(settings.database_path) as conn:
        conn.execute(
            f"INSERT INTO businesses ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
            list(values.values()),
        )
        conn.commit()
    return business


@router.get("/api/businesses/{business_id}", response_model=Business)
def get_business(business_id: str, settings: Annotated[Settings, Depends(get_settings)]):
    with database(settings.database_path) as conn:
        return find_business(conn, business_id)
