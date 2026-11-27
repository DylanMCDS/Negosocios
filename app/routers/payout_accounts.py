from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.services import payout_accounts as svc
from app.services.orders import database, find_business

router = APIRouter()


class PayoutAccountIn(BaseModel):
    clabe: str
    mode: Literal["simulated", "pey"] = "simulated"
    pey_bank_account_id: str | None = None


@router.put("/api/businesses/{business_id}/payout-account")
def put_payout_account(business_id: str, body: PayoutAccountIn, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    with database(settings.database_path) as conn:
        find_business(conn, business_id)
        try:
            return svc.save(conn, business_id, body.clabe, body.mode, body.pey_bank_account_id)
        except ValueError as error:
            raise HTTPException(422, str(error)) from None


@router.get("/api/businesses/{business_id}/payout-account")
def get_payout_account(business_id: str, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    with database(settings.database_path) as conn:
        account = svc.get(conn, business_id)
    if account is None:
        raise HTTPException(404, "El negocio no tiene cuenta receptora registrada")
    return account


@router.get("/api/orders/{order_id}/settlement")
def get_settlement(order_id: str, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    with database(settings.database_path) as conn:
        found = svc.settlement_for(conn, order_id)
    if found is None:
        raise HTTPException(404, "Orden no encontrada")
    return found
