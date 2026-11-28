from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from pydantic import Field, model_validator

from app.config import Settings, get_settings
from app.schemas import Contract
from app.services import coupons, orders

router = APIRouter()
Identifier = Annotated[str, Field(min_length=1, max_length=200)]


class Claim(Contract):
    alliance_id: Identifier
    business_id: Identifier | None = None
    order_id: Identifier | None = None
    point_id: Identifier | None = None

    @model_validator(mode="after")
    def receipt_or_point(self):
        if not self.point_id and not (self.business_id and self.order_id):
            raise ValueError("Indica el negocio y la orden pagada, o el punto del negocio")
        return self


class Redeem(Contract):
    business_id: Identifier
    order_id: Identifier
    amount_cents: Annotated[int, Field(strict=True, gt=0)]


def get_now():
    return datetime.now(UTC)


def connection(settings):
    return orders.database(settings.database_path)


@router.post("/api/coupons/claim", status_code=201)
def claim(body: Claim, response: Response, settings: Annotated[Settings, Depends(get_settings)],
          now: Annotated[datetime, Depends(get_now)]):
    response.headers["Cache-Control"] = "no-store"
    with connection(settings) as conn:
        coupons.ensure_tables(conn)
        return coupons.claim(conn, body, now)


@router.get("/api/coupons/{token}")
def view(token: str, response: Response, settings: Annotated[Settings, Depends(get_settings)],
         now: Annotated[datetime, Depends(get_now)]):
    response.headers["Cache-Control"] = "no-store"
    with connection(settings) as conn:
        coupons.ensure_tables(conn)
        return coupons.view(conn, token, now)


@router.post("/api/coupons/{token}/redeem")
def redeem(token: str, body: Redeem, response: Response, settings: Annotated[Settings, Depends(get_settings)],
           now: Annotated[datetime, Depends(get_now)]):
    response.headers["Cache-Control"] = "no-store"
    with connection(settings) as conn:
        coupons.ensure_tables(conn)
        return coupons.redeem(conn, token, body, now)
