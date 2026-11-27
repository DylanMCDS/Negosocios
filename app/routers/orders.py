from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from app.config import Settings, get_settings
from app.schemas import Business, Contract, Order, OrderCreate
from app.services import orders
from app.services.pey import HttpPeyClient, PeyClient

router = APIRouter()


def get_pey_client(settings: Annotated[Settings, Depends(get_settings)]) -> PeyClient:
    if not settings.pey_api_key:
        raise HTTPException(502, "Servicio de cobro no configurado")
    return HttpPeyClient(settings.pey_api_key)


class OrderDetail(Contract):
    order: Order
    business: Business


@router.post("/api/orders", status_code=201, response_model=Order)
def create_order(
    body: OrderCreate, response: Response,
    idempotency_key: Annotated[str, Header(min_length=1)],
    settings: Annotated[Settings, Depends(get_settings)],
    pey: Annotated[PeyClient, Depends(get_pey_client)],
):
    with orders.database(settings.database_path) as conn:
        order, created = orders.create_order(conn, body, idempotency_key, pey)
    response.status_code = 201 if created else 200
    return order


@router.get("/api/orders/{order_id}", response_model=OrderDetail)
def get_order(order_id: str, settings: Annotated[Settings, Depends(get_settings)]):
    with orders.database(settings.database_path) as conn:
        order = orders.find_order(conn, order_id)
        return OrderDetail(order=order, business=orders.find_business(conn, order.business_id))
