import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Aliados from "./index";

const network = (id: string, name: string) => ({
  business_id: id, name, category: "Café", zone: "Centro", lat: 19.43, lng: -99.13, location_precision: "approximate", schedule: {},
  accepts_codi: true, verified: false, verification_text: null, rating: null, rating_count: 0, distance_km: 0.2, open_now: true,
  temporary_current: false, temporary_expires_at: null, demo_data: true,
});
const simulation = {
  currency: "MXN", ok: true, max_discount_pct: 10, message: null, budget_cents: 5000, max_uses: 5,
  formula: "100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)",
};
const existing = {
  id: "al-1", business_a: "rosa", business_b: "cafe", giver: "rosa", status: "active", discount_pct: 10, budget_cents: 10000,
  budget_used_cents: 500, max_uses: 5, uses: 1, referral_code: "ABCD1234", partner_id: "cafe", partner_name: "Café Lupita", role: "giver",
};
const metrics = { alliance_id: "al-1", referrals: 2, paid_purchases: 1, paid_sales_cents: 9000, benefit_cost_cents: 2000, estimated_contribution_cents: 3000, note: "Estimación basada en una correlación observada; no demuestra causalidad." };

let calls: Array<{ url: string; method: string; body?: string }>;
let alliances: unknown[];
beforeEach(() => {
  calls = [];
  alliances = [];
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.startsWith("/api/network")) return json([network("cafe", "Café Lupita"), network("papeleria", "Papelería Sol")]);
    if (url === "/api/campaigns/simulate") return json(simulation);
    if (url === "/api/alliances" && method === "POST") return json({ ...existing, status: "proposal" }, 201);
    if (url.startsWith("/api/alliances?")) return json(alliances);
    if (url.endsWith("/metrics")) return json(metrics);
    return json({}, 404);
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function openProposal() {
  render(<Aliados />);
  await userEvent.click(await screen.findByRole("button", { name: /Proponer alianza a Café Lupita/ }));
  await userEvent.type(screen.getByLabelText("Precio"), "100");
  await userEvent.type(screen.getByLabelText("Costo"), "60");
  await userEvent.type(screen.getByLabelText("Ganancia mínima"), "30");
  await screen.findByText(/Puedes dar hasta 10 %/);
}

describe("Aliados", () => {
  it("slider_stops_at_max_discount", async () => {
    await openProposal();
    const slider = screen.getByRole("slider", { name: "Descuento" }) as HTMLInputElement;
    expect(slider.max).toBe("10");
    fireEvent.change(slider, { target: { value: "15" } });
    expect(slider.value).toBe("10"); // stops at the maximum: it never offers a losing discount
    expect(screen.getByText(/\$100 − \$90/)).toBeInTheDocument(); // the account is visible
    expect(calls.some((c) => c.url === "/api/campaigns/simulate" && JSON.parse(c.body!).price_cents === 10000)).toBe(true);
  });

  it("proposes_alliance_to_network_business", async () => {
    await openProposal();
    fireEvent.change(screen.getByRole("slider", { name: "Descuento" }), { target: { value: "8" } });
    await userEvent.type(screen.getByLabelText("Presupuesto"), "50");
    await userEvent.type(screen.getByLabelText("Usos"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Proponer" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/alliances" && c.method === "POST")).toBe(true));
    const sent = JSON.parse(calls.find((c) => c.url === "/api/alliances" && c.method === "POST")!.body!);
    expect(sent).toMatchObject({
      business_a: "rosa", business_b: "cafe", giver: "rosa", discount_pct: 8, budget_cents: 5000, max_uses: 5,
      price_cents: 10000, variable_cost_cents: 6000, min_contribution_cents: 3000,
    });
  });

  it("shows_sales_brought_by_allies_and_accepts_proposals", async () => {
    alliances = [existing, { ...existing, id: "al-2", business_a: "papeleria", business_b: "rosa", status: "proposal", partner_id: "papeleria", partner_name: "Papelería Sol", role: "referrer", referral_code: "ZZZZ0000" }];
    render(<Aliados />);
    expect(await screen.findByText("Café Lupita")).toBeInTheDocument();
    expect(screen.getByText("Las ventas que te trajeron tus aliados")).toBeInTheDocument();
    expect(await screen.findByText(/\$90/)).toBeInTheDocument();
    expect(screen.getByText(/correlación observada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Aceptar propuesta de Papelería Sol/ }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/alliances/al-2/accept" && c.method === "POST")).toBe(true));
  });
});
