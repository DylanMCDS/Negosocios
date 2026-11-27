import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Pagar from "./index";

const order = (over: Record<string, unknown> = {}) => ({
  id: "1234567",
  business_id: "rosa",
  amount_cents: 10000,
  concept: "Orden de tacos",
  currency: "MXN",
  status: "pending",
  idempotency_key: "k",
  codi_qr_id: "qr-1",
  qr_string: "000201CODI-DEMO-1234567",
  created_at: "2026-11-26T18:00:00Z",
  expires_at: "2026-11-26T18:10:00Z",
  paid_at: null,
  reconciliation_required: false,
  reconciliation_reason: null,
  demo_data: false,
  ...over,
});
const business = {
  id: "rosa",
  name: "Tacos de Doña Rosa",
  category: "Comida",
  zone: "Tianguis",
  temporary_location: null,
  location_expires_at: null,
  demo_data: false,
};
const payment = {
  id: "p1",
  order_id: "1234567",
  codi_qr_id: "qr-1",
  transaction_id: "TX-998877",
  webhook_id: "w1",
  amount_cents: 10000,
  currency: "MXN",
  paid_at: "2026-11-26T18:01:00Z",
  demo_data: false,
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

function serve(o: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ order: order(o), payment }) : json({ order: order(o), business }),
    ),
  );
}

beforeEach(() => window.history.pushState({}, "", "/pagar/1234567"));
afterEach(() => vi.unstubAllGlobals());

describe("Pagar", () => {
  it("shows_receiver_and_amount_before_paying", async () => {
    serve({});
    render(<Pagar />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeTruthy();
    expect(screen.getByText("$100.00")).toBeTruthy();
    expect(screen.getByText("Orden de tacos")).toBeTruthy();
    expect(screen.getByRole("img", { name: /código qr/i })).toBeTruthy();
  });

  it("shows_receipt_when_paid", async () => {
    serve({ status: "paid", paid_at: "2026-11-26T18:01:00Z" });
    render(<Pagar />);
    expect(await screen.findByText(/comprobante/i)).toBeTruthy();
    expect(screen.getByText("$100.00")).toBeTruthy();
    expect(screen.getByText("Tacos de Doña Rosa")).toBeTruthy();
    expect(await screen.findByText("TX-998877")).toBeTruthy();
  });

  it("shows_expired_message", async () => {
    serve({ status: "expired" });
    render(<Pagar />);
    expect(await screen.findByText(/expir/i)).toBeTruthy();
    expect(screen.getByText(/pide otro cobro/i)).toBeTruthy();
    expect(screen.queryByRole("img", { name: /código qr/i })).toBeNull();
  });
});
