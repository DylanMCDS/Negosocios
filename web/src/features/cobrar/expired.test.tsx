import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const order = (id: string, expires: string) => ({
  id, business_id: "rosa", amount_cents: 5000, concept: `Cobro ${id}`, currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr", qr_string: "000201", created_at: "2026-11-28T10:00:00Z", expires_at: expires, paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  localStorage.setItem("negosocios.cobrar.pending", JSON.stringify(["1111111", "2222222"]));
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.includes("/orders/1111111")) return json({ order: order("1111111", hours(1)) });
    if (url.includes("/orders/2222222")) return json({ order: order("2222222", hours(-1)) });
    return json({});
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Cobrar con cobros vencidos", () => {
  it("cobrar_waiting_list_excludes_expired", async () => {
    render(<Cobrar />);
    expect(await screen.findByText(/Tienes 1 cobro pendiente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cobro 1111111/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cobro 2222222/ })).toBeNull();
  });
});
