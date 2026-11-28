import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dividir from "./index";

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const order = (id: string, concept: string, expires: string) => ({
  id, business_id: "rosa", amount_cents: 8400, concept, currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr", qr_string: "000201", created_at: "2026-11-28T10:00:00Z", expires_at: expires, paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
const business = { id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis", temporary_location: null, location_expires_at: null, demo_data: false };
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

let splitReply: { status: number; detail: string };
beforeEach(() => {
  window.location.hash = "#dividir";
  splitReply = { status: 409, detail: "La orden ya venció; genera otro cobro" };
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith("/api/closing/today")) {
      const pending = [order("1111111", "Cena vigente", hours(1)), order("2222222", "Cena vencida", hours(-1))];
      return json({ currency: "MXN", confirmed_sales_cents: 0, expenses_cents: 0, estimated_profit_cents: 0, pending, pending_cents: 16800, missing: [] });
    }
    if (url === "/api/orders/2222222/split" && init?.method === "POST") return json({ detail: splitReply.detail }, splitReply.status);
    if (url === "/api/orders/2222222/split") return json({ detail: "La orden no está dividida" }, 404);
    if (url === "/api/orders/2222222") return json({ order: order("2222222", "Cena vencida", hours(-1)), business });
    return json({}, 404);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Dividir con cobros vencidos", () => {
  it("dividir_hides_expired_orders", async () => {
    render(<Dividir />);
    expect(await screen.findByText("Cena vigente")).toBeInTheDocument();
    expect(screen.queryByText("Cena vencida")).toBeNull();
  });

  it("dividir_shows_expired_message_on_409", async () => {
    window.location.hash = "#dividir/2222222";
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /crear cobros/i }));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Este cobro venció. Genera otro en Cobrar");
    expect(screen.getByRole("link", { name: /cobrar/i })).toHaveAttribute("href", "#cobrar");
    expect(screen.queryByText(/intenta de nuevo/i)).toBeNull();
  });

  it("dividir_drops_order_when_it_expires_while_open", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.startsWith("/api/closing/today")
        ? json({ currency: "MXN", confirmed_sales_cents: 0, expenses_cents: 0, estimated_profit_cents: 0, pending: [order("3333333", "Cena por vencer", new Date(Date.now() + 1500).toISOString())], pending_cents: 8400, missing: [] })
        : json({}, 404),
    ));
    render(<Dividir />);
    expect(await screen.findByText("Cena por vencer")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Cena por vencer")).toBeNull(), { timeout: 4000 });
  });
});
