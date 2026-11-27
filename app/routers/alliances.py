from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.config import Settings, get_settings
from app.services import alliances, orders, reviews

router = APIRouter()
Cents = Annotated[int, Field(strict=True, ge=0)]


class AllianceProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_a: Annotated[str, Field(min_length=1)]
    business_b: Annotated[str, Field(min_length=1)]
    giver: Annotated[str, Field(min_length=1)]
    discount_pct: Annotated[float, Field(gt=0, le=100)]
    budget_cents: Cents
    max_uses: Annotated[int, Field(strict=True, gt=0)]
    price_cents: Annotated[int, Field(strict=True, gt=0)]
    variable_cost_cents: Cents
    min_contribution_cents: Cents
    currency: Literal["MXN"] = "MXN"


class Quote(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount_cents: Annotated[int, Field(strict=True, gt=0)]
    # The order id, or the Idempotency-Key the order will be created with: one benefit per value.
    order_id: Annotated[str, Field(min_length=1)]


def _db(settings: Settings):
    return orders.database(settings.database_path)


@router.post("/api/alliances", status_code=201)
def propose(body: AllianceProposal, settings: Annotated[Settings, Depends(get_settings)]):
    with _db(settings) as conn:
        reviews.ensure_all(conn)
        return alliances.propose(conn, body.model_dump(exclude={"currency"}))


@router.post("/api/alliances/{alliance_id}/accept")
def accept(alliance_id: str, settings: Annotated[Settings, Depends(get_settings)]):
    with _db(settings) as conn:
        reviews.ensure_all(conn)
        return alliances.accept(conn, alliance_id)


@router.post("/api/alliances/{alliance_id}/quote")
def quote(alliance_id: str, body: Quote, settings: Annotated[Settings, Depends(get_settings)]):
    with _db(settings) as conn:
        reviews.ensure_all(conn)
        return alliances.quote(conn, alliance_id, body.amount_cents, body.order_id)


@router.get("/api/alliances/{alliance_id}/metrics")
def metrics(alliance_id: str, settings: Annotated[Settings, Depends(get_settings)]):
    with _db(settings) as conn:
        reviews.ensure_all(conn)
        return alliances.metrics(conn, alliance_id)
