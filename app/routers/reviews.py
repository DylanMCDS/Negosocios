from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.config import Settings, get_settings
from app.services import orders, reviews

router = APIRouter()


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    order_id: Annotated[str, Field(min_length=1)]
    stars: Annotated[int, Field(strict=True, ge=1, le=5)]
    text: Annotated[str, Field(max_length=500)] = ""


@router.post("/api/reviews", status_code=201)
def create_review(body: ReviewCreate, settings: Annotated[Settings, Depends(get_settings)]):
    with orders.database(settings.database_path) as conn:
        reviews.ensure_all(conn)
        return reviews.create(conn, body.order_id, body.stars, body.text)


@router.get("/api/businesses/{business_id}/reputation")
def reputation(business_id: str, settings: Annotated[Settings, Depends(get_settings)]):
    with orders.database(settings.database_path) as conn:
        reviews.ensure_all(conn)
        return reviews.reputation(conn, business_id)
