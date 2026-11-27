import sqlite3
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.services import expenses as expenses_svc
from app.services import recurring

router = APIRouter()
Conn = Annotated[sqlite3.Connection, Depends(expenses_svc.get_conn)]
AsOf = Annotated[date | None, Query(description="Fecha de referencia (demo y pruebas); por defecto hoy en CDMX")]


class Decision(BaseModel):
    business_id: str
    key: str
    decision: Literal["confirm", "dismiss"]


@router.get("/api/recommendations")
def get_recommendations(business_id: str, conn: Conn, as_of: AsOf = None) -> dict:
    if not expenses_svc.business_exists(conn, business_id):
        raise HTTPException(404, "negocio no encontrado")
    recurring.ensure_demo_history(conn, business_id, as_of)
    return recurring.recommendations(conn, business_id, as_of)


@router.post("/api/recommendations/decision")
def decide(body: Decision, conn: Conn, as_of: AsOf = None) -> dict:
    if not recurring.decide(conn, body.business_id, body.key, body.decision, as_of):
        raise HTTPException(404, "propuesta no encontrada")
    return recurring.recommendations(conn, body.business_id, as_of)


@router.post("/api/recommendations/demo-history")
def load_demo_history(business_id: str, conn: Conn, as_of: AsOf = None) -> dict:
    """Loads the labeled demo expense history (demo_data). Idempotent. Real data is never touched."""
    if not expenses_svc.business_exists(conn, business_id):
        raise HTTPException(404, "negocio no encontrado")
    return {"demo_data": True, "inserted": recurring.seed_history(conn, business_id, as_of)}
