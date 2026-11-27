from typing import Annotated, Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from app.schemas import CampaignSimulation
from app.services import expenses as svc

router = APIRouter()
Cents = Annotated[int, Field(strict=True, ge=0)]


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    price_cents: Annotated[int, Field(strict=True, gt=0)]
    variable_cost_cents: Cents
    min_contribution_cents: Cents
    budget_cents: Cents
    currency: Literal["MXN"] = "MXN"


@router.post("/api/campaigns/simulate", response_model=CampaignSimulation)
def simulate(body: SimulationRequest) -> dict:
    return svc.simulate(body.price_cents, body.variable_cost_cents, body.min_contribution_cents, body.budget_cents)
