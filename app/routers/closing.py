import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import Closing
from app.services import expenses as svc

router = APIRouter()


@router.get("/api/closing/today", response_model=Closing)
def closing_today(business_id: str, conn: sqlite3.Connection = Depends(svc.get_conn)) -> dict:
    if not svc.business_exists(conn, business_id):
        raise HTTPException(404, "negocio no encontrado")
    return svc.closing_today(conn, business_id)


@router.post("/api/demo/seed")
def seed(conn: sqlite3.Connection = Depends(svc.get_conn)) -> dict:
    return svc.seed_demo(conn)
