import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dividir from "./index";

const order = (demo: boolean) => ({
  id: "1234567", business_id: "rosa", amount_cents: 10001, concept: "Cena", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-0", qr_string: null, created_at: "2026-11-27T18:00:00Z", expires_at: "2026-11-27T18:10:00Z",
  paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: demo,
});
const business = (demo: boolean) => ({ id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis", temporary_location: null, location_expires_at: null, demo_data: demo });
const parts = [
  { idx: 1, amount_cents: 5001, status: "pending", paid_at: null, codi_qr_id: "q1", qr_string: "000201P1" },
  { idx: 2, amount_cents: 5000, status: "pending", paid_at: null, codi_qr_id: "q2", qr_string: "000201P2" },
];
const split = { order_id: "1234567", currency: "MXN", parts, total_cents: 10001, paid_cents: 0, missing: [1, 2] };
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

function serve(demo: boolean) {
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/orders/1234567/split") return json(split);
    if (url === "/api/orders/1234567") return json({ order: order(demo), business: business(demo) });
    return json({}, 404);
  }));
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Dividir: datos de ejemplo", () => {
  it("parts_view_shows_the_sample_data_badge_for_demo_orders", async () => {
    window.location.hash = "#dividir/1234567";
    serve(true);
    render(<Dividir />);
    expect(await screen.findByText(/faltan 2 de 2/i)).toBeInTheDocument();
    expect(await screen.findByText("Datos de ejemplo")).toBeInTheDocument();
  });

  it("part_page_shows_the_sample_data_badge_for_demo_orders", async () => {
    window.location.hash = "#dividir/1234567/1";
    serve(true);
    render(<Dividir />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeInTheDocument();
    expect(screen.getByText("Datos de ejemplo")).toBeInTheDocument();
  });

  it("no_sample_data_badge_for_real_orders", async () => {
    window.location.hash = "#dividir/1234567";
    serve(false);
    render(<Dividir />);
    expect(await screen.findByText(/faltan 2 de 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Datos de ejemplo")).toBeNull();
  });
});
