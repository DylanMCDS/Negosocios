import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import Expense, ExpenseCreate
from app.services import expenses as svc

router = APIRouter()


@router.post("/api/expenses", response_model=Expense, status_code=201)
def create_expense(body: ExpenseCreate, conn: sqlite3.Connection = Depends(svc.get_conn)) -> dict:
    if not svc.business_exists(conn, body.business_id):
        raise HTTPException(404, "negocio no encontrado")
    return svc.add_expense(conn, body.model_dump())
