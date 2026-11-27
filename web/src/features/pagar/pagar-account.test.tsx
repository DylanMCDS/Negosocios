import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pagar from "./index";

const order = (over: Record<string, unknown> = {}) => ({
  id: "1234567", business_id: "rosa", amount_cents: 10000, concept: "Orden de tacos", currency: "MXN",
  status: "pending", idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI-DEMO-1234567",
  created_at: "2026-11-26T18:00:00Z", expires_at: "2026-11-26T18:10:00Z", paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false, ...over,
});
const business = {
  id: "rosa", name: "Tacos de Doña Rosa", category: "Comida", zone: "Tianguis",
  temporary_location: null, location_expires_at: null, demo_data: false,
};
const account = { business_id: "rosa", bank: "Banamex", last4: "7771", mode: "simulated", simulated: true, label: "cuenta simulada" };
const payment = {
  id: "p1", order_id: "1234567", codi_qr_id: "qr-1", transaction_id: "TX-998877", webhook_id: "w1",
  amount_cents: 10000, currency: "MXN", paid_at: "2026-11-26T18:01:00Z", demo_data: false,
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

function serve(o: Record<string, unknown>, acct: unknown | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/payout-account")) return acct ? json(acct) : json({ detail: "sin cuenta" }, 404);
      return init?.method === "POST" ? json({ order: order(o), payment }) : json({ order: order(o), business });
    }),
  );
}

beforeEach(() => window.history.pushState({}, "", "/pagar/1234567"));
afterEach(() => vi.unstubAllGlobals());

describe("Pagar: cuenta receptora", () => {
  it("pagar_shows_simulated_receiver_account", async () => {
    serve({}, account);
    render(<Pagar />);
    expect(await screen.findByText(/Recibe: Tacos de Doña Rosa · Banamex · \*\*\*\*7771 \(cuenta simulada\)/)).toBeTruthy();
    expect(screen.getByText("$100.00")).toBeTruthy();
  });

  it("omits_the_account_line_when_the_business_has_none", async () => {
    serve({}, null);
    render(<Pagar />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeTruthy();
    expect(screen.queryByText(/Recibe:/)).toBeNull();
  });

  it("ignores_an_unexpected_account_payload", async () => {
    serve({}, { unexpected: true });
    render(<Pagar />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeTruthy();
    expect(screen.queryByText(/Recibe:/)).toBeNull();
  });

  it("receipt_does_not_claim_the_business_received_the_money", async () => {
    serve({ status: "paid", paid_at: "2026-11-26T18:01:00Z" }, account);
    render(<Pagar />);
    expect(await screen.findByText(/TX-998877/)).toBeTruthy();
    expect(screen.queryByText(/ya recibió/i)).toBeNull();
  });
});
