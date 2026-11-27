from fastapi import APIRouter
from pydantic import BaseModel

from app.services.voice_parse import parse_expense

router = APIRouter()


class ParseIn(BaseModel):
    text: str


@router.post("/api/expenses/parse")
def parse(body: ParseIn) -> dict:
    return parse_expense(body.text)
