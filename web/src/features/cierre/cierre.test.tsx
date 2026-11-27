import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CampaignSimulation, Closing } from "../../lib/types";
import Cierre from "./index";

const closing: Closing = {
  currency: "MXN",
  confirmed_sales_cents: 20000,
  expenses_cents: 14000,
  estimated_profit_cents: 6000,
  pending: [],
  pending_cents: 0,
  missing: [],
};

const simulation: CampaignSimulation = {
  currency: "MXN", ok: true, max_discount_pct: 10, message: null,
  formula: "100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)",
  budget_cents: 10000, max_uses: 10,
};

function mockApi(data: Closing, sim: CampaignSimulation = simulation) {
  const calls: Array<{ url: string; body?: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body as string | undefined });
    const payload = url.includes("/campaigns/simulate") ? sim : data;
    return new Response(JSON.stringify(payload), { status: 200 });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("Cierre del día", () => {
  it("shows_profit_from_closing_api", async () => {
    const calls = mockApi(closing);
    render(<Cierre />);
    expect(await screen.findByText(/60/, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Utilidad estimada")).toBeInTheDocument();
    expect(calls[0].url).toMatch(/^\/api\/closing\/today\?business_id=/);
  });

  it("shows_missing_data_warning", async () => {
    mockApi({ ...closing, expenses_cents: 0, estimated_profit_cents: 20000, missing: ["expenses"] });
    render(<Cierre />);
    expect(await screen.findByText(/Faltan tus gastos/)).toBeInTheDocument();
    expect(screen.getByText(/utilidad es estimada/i)).toBeInTheDocument();
  });

  it("simulator_shows_max_discount", async () => {
    const calls = mockApi(closing);
    render(<Cierre />);
    await screen.findByText("Utilidad estimada");
    await userEvent.type(screen.getByLabelText("Precio"), "100");
    await userEvent.type(screen.getByLabelText("Costo"), "60");
    await userEvent.type(screen.getByLabelText("Ganancia mínima"), "30");
    await userEvent.type(screen.getByLabelText("Presupuesto"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("Puedes dar hasta 10 % de descuento")).toBeInTheDocument();
    expect(screen.getByText(/alcanza para 10 usos/)).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.url === "/api/campaigns/simulate")).toBe(true));
    const sent = JSON.parse(calls.find((c) => c.url === "/api/campaigns/simulate")!.body!);
    expect(sent).toMatchObject({ price_cents: 10000, variable_cost_cents: 6000, min_contribution_cents: 3000, budget_cents: 10000 });
  });
});
