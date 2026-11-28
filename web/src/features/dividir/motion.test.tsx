import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dividir from "./index";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const order = {
  id: "1234567", business_id: "rosa", amount_cents: 9000, concept: "Cena", currency: "MXN", status: "paid", idempotency_key: "k",
  codi_qr_id: "qr", qr_string: "000201", created_at: "2026-11-28T10:00:00Z", expires_at: "2099-11-28T10:10:00Z", paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
};
const business = { id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis", temporary_location: null, location_expires_at: null, demo_data: false };
const part = (idx: number) => ({ idx, amount_cents: 4500, status: "paid", paid_at: "2026-11-28T10:02:00Z", codi_qr_id: `qr-${idx}`, qr_string: `000201P${idx}` });
const split = { order_id: "1234567", currency: "MXN", parts: [part(1), part(2)], total_cents: 9000, paid_cents: 9000, missing: [] };

beforeEach(() => {
  window.location.hash = "#dividir/1234567";
  vi.stubGlobal("fetch", vi.fn((url: string) =>
    url === "/api/orders/1234567/split" ? json(split) : url === "/api/orders/1234567" ? json({ order, business }) : json({}, 404),
  ));
});
afterEach(() => vi.unstubAllGlobals());

describe("Dividir: movimiento", () => {
  it("dividir_cuenta_completa_uses_fade_in", async () => {
    render(<Dividir />);
    const title = await screen.findByText("Cuenta completa");
    const fade = title.closest('[data-testid="fade-in"]') as HTMLElement | null;
    expect(fade).not.toBeNull();
    expect(within(fade!).getByText("Cuenta completa")).toBeInTheDocument();
  });
});
