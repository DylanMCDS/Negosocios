from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, get_settings
from app.services import orders, payments
from app.services.pey_webhook import verify_webhook

router = APIRouter()


@router.post("/api/webhooks/pey")
async def pey_webhook(request: Request, settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    raw = await request.body()
    try:
        event = verify_webhook(raw, dict(request.headers), settings.pey_webhook_secret)
    except Exception:  # firma, timestamp, headers o secreto ausente: nada cambia
        raise HTTPException(401, "firma inválida") from None
    webhook_id = request.headers["webhook-id"]
    if not isinstance(event, dict):
        raise HTTPException(400, "evento inválido")
    with orders.database(settings.database_path) as conn:
        payments.process_event(conn, webhook_id, event)
    return {"ok": True}
