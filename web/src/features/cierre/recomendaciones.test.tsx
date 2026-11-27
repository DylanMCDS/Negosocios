import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Cierre from "./index";
import Recomendaciones from "./Recomendaciones";

const rent = {
  kind: "recurring_proposal", key: "renta del local", label: "renta del local", period: "monthly",
  amount_cents: 120000, next_due: "2026-12-01", days_until: 5, daily_reserve_cents: 24000,
  text: "Tu renta del local ($1,200) vence en 5 días: reserva $240 diarios",
  data_used: [{ id: "a", date: "2026-11-01", amount_cents: 120000 }], missing_data: [],
};
const growth = {
  kind: "growing_expense", label: "tortillas", change_pct: 18, period: "últimos 7 días vs. los 7 anteriores",
  text: "El gasto en tortillas subió 18 % vs. la semana pasada", data_used: [{ id: "b" }], missing_data: [],
};
const margin = {
  kind: "best_margin", period: "últimos 30 días", text: "Necesito el precio y el costo de cada producto.",
  data_used: [{ fuente: "gastos registrados", cantidad: 6 }], missing_data: ["precio por producto"],
};
const before = { business_id: "rosa", as_of: "2026-11-26", recommendations: [rent, growth, margin], commitments: [] };
const after = {
  ...before, recommendations: [growth, margin],
  commitments: [{ key: rent.key, label: rent.label, period: "monthly", amount_cents: 120000, next_due: "2026-12-01", days_until: 5, daily_reserve_cents: 24000 }],
};

function mockApi() {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
    return new Response(JSON.stringify(init?.method === "POST" ? after : before), { status: 200 });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("Recomendaciones", () => {
  it("shows_recommendations_with_used_and_missing_data", async () => {
    mockApi();
    render(<Recomendaciones businessId="rosa" />);
    expect(await screen.findByText(/reserva \$240 diarios/)).toBeInTheDocument();
    expect(screen.getByText(/subió 18 %/)).toBeInTheDocument();
    expect(screen.getByText(/Faltan: precio por producto/)).toBeInTheDocument();
    expect(screen.getByText("Pagos próximos")).toBeInTheDocument();
  });

  it("commits_only_after_confirm_and_moves_to_upcoming_payments", async () => {
    const calls = mockApi();
    render(<Recomendaciones businessId="rosa" />);
    await screen.findByText(/reserva \$240 diarios/);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    await waitFor(() => expect(calls.filter((c) => c.method === "POST")).toHaveLength(1));
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/recommendations/decision");
    expect(JSON.parse(post.body!)).toEqual({ business_id: "rosa", key: "renta del local", decision: "confirm" });
    expect(await screen.findByText(/En 5 días/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it("dismiss_sends_decision_without_creating_a_payment", async () => {
    const calls = mockApi();
    render(<Recomendaciones businessId="rosa" />);
    await screen.findByText(/reserva \$240 diarios/);
    await userEvent.click(screen.getByRole("button", { name: /descartar/i }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(JSON.parse(calls.find((c) => c.method === "POST")!.body!).decision).toBe("dismiss");
  });

  it("labels_recommendations_built_from_demo_data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...before, demo_data: true }), { status: 200 })));
    render(<Recomendaciones businessId="rosa" />);
    await screen.findByText(/reserva \$240 diarios/);
    expect(screen.getAllByText(/datos de ejemplo/i).length).toBeGreaterThan(0);
  });

  it("shows_no_demo_label_for_real_data", async () => {
    mockApi();
    render(<Recomendaciones businessId="rosa" />);
    await screen.findByText(/reserva \$240 diarios/);
    expect(screen.queryByText(/datos de ejemplo/i)).not.toBeInTheDocument();
  });

  it("renders_nothing_when_the_response_has_an_unexpected_shape", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ currency: "MXN" }), { status: 200 })));
    const { container } = render(<Recomendaciones businessId="rosa" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Cierre con recomendaciones", () => {
  it("loads_recommendations_after_the_closing_request", async () => {
    const calls: Array<{ url: string }> = [];
    const closing = { currency: "MXN", confirmed_sales_cents: 0, expenses_cents: 0, estimated_profit_cents: 0, pending: [], pending_cents: 0, missing: [] };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push({ url });
      return new Response(JSON.stringify(url.startsWith("/api/closing") ? closing : before), { status: 200 });
    }));
    render(<Cierre />);
    await screen.findByText(/reserva \$240 diarios/);
    expect(calls[0].url).toMatch(/^\/api\/closing\/today/);
    expect(calls.some((c) => c.url.startsWith("/api/recommendations?business_id="))).toBe(true);
  });
});
