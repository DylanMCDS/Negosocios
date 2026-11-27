import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from app.config import Settings, get_settings
from app.routers.orders import get_pey_client
from app.services import orders, payments
from app.services.pey import PeyClient, PeyError

router = APIRouter()


class PushRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phone: str


@router.post("/api/orders/{order_id}/push")
def send_push(order_id: str, body: PushRequest, settings: Annotated[Settings, Depends(get_settings)],
              pey: Annotated[PeyClient, Depends(get_pey_client)]):
    if not re.fullmatch(r"[0-9]{10}", body.phone):
        raise HTTPException(422, "El celular debe tener 10 dígitos, sin espacios ni lada")
    with orders.database(settings.database_path) as conn:
        order = orders.find_order(conn, order_id)
        if order.status != "pending":
            raise HTTPException(409, "Sólo se puede pedir el pago de una orden pendiente")
        try:
            result = pey.create_push(body.phone, order.amount_cents / 100, order.concept, order.id)
        except PeyError:
            raise HTTPException(502, "No pudimos enviar el cobro al celular") from None
        payments.record_push(conn, order.id, result.transaction_id, result.codi_id, body.phone)
        conn.commit()
    return {"sent": True, "transaction_id": result.transaction_id, "phone_last4": body.phone[-4:]}
