"""Shared wire contract. Monetary values are integer MXN centavos."""
from datetime import date, datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Cents = Annotated[int, Field(strict=True, ge=0)]
PositiveCents = Annotated[int, Field(strict=True, gt=0)]
Identifier = Annotated[str, Field(min_length=1)]
OrderStatus = Literal["pending", "paid", "expired", "failed"]

class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")

class Business(Contract):
    id: Identifier
    name: Annotated[str, Field(min_length=1)]
    category: Annotated[str, Field(min_length=1)]
    zone: Annotated[str, Field(min_length=1)]
    temporary_location: str | None = None
    location_expires_at: datetime | None = None
    demo_data: bool = False

class OrderCreate(Contract):
    business_id: Identifier
    amount_cents: PositiveCents
    concept: Annotated[str, Field(min_length=1, max_length=40)]
    currency: Literal["MXN"] = "MXN"

class Order(OrderCreate):
    id: Identifier
    status: OrderStatus = "pending"
    idempotency_key: Identifier
    codi_qr_id: str | None = None
    qr_string: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    paid_at: datetime | None = None
    reconciliation_required: bool = False
    reconciliation_reason: str | None = None
    demo_data: bool = False

class Payment(Contract):
    id: Identifier
    order_id: Identifier
    codi_qr_id: Identifier
    transaction_id: Identifier
    webhook_id: Identifier
    amount_cents: PositiveCents
    currency: Literal["MXN"] = "MXN"
    paid_at: datetime
    demo_data: bool = False

class ExpenseCreate(Contract):
    business_id: Identifier
    amount_cents: PositiveCents
    category: Annotated[str, Field(min_length=1)]
    date: date
    source: Literal["voice", "manual"] = "manual"
    description: str = ""
    currency: Literal["MXN"] = "MXN"

class Expense(ExpenseCreate):
    id: Identifier
    demo_data: bool = False

class Closing(Contract):
    currency: Literal["MXN"] = "MXN"
    confirmed_sales_cents: Cents
    expenses_cents: Cents
    estimated_profit_cents: Annotated[int, Field(strict=True)]
    pending: list[Order]
    pending_cents: Cents
    missing: list[str]

class CampaignSimulation(Contract):
    currency: Literal["MXN"] = "MXN"
    ok: bool
    max_discount_pct: Annotated[float, Field(ge=0, le=100)] | None
    message: str | None
    formula: str
    budget_cents: Cents
    max_uses: Annotated[int, Field(strict=True, ge=0)] | None
