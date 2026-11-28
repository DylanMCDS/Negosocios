import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Pagar from "./index";

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
const order = {
  id: "1234567", business_id: "rosa", amount_cents: 10000, concept: "Orden de tacos", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z",
  expires_at: "2099-11-26T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: false,
};
const business = {
  id: "rosa", name: "Tacos de Doña Rosa", category: "Comida", zone: "Tianguis", temporary_location: null,
  location_expires_at: null, demo_data: false,
};
const serve = () => vi.stubGlobal("fetch", vi.fn(() => json({ order, business })));
afterEach(() => vi.unstubAllGlobals());

describe("Pagar dentro y fuera de la app", () => {
  it("pagar_back_button_returns_to_cobrar", async () => {
    serve();
    window.history.pushState({}, "", "/#pagar/1234567");
    render(<Pagar />);
    fireEvent.click(await screen.findByRole("button", { name: /volver/i }));
    expect(window.location.hash).toBe("#cobrar");
  });

  it("direct_pagar_link_hides_back_button", async () => {
    serve();
    window.history.pushState({}, "", "/pagar/1234567");
    render(<Pagar />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /volver/i })).toBeNull();
  });

  it("menu_works_from_pagar_path", async () => {
    serve();
    window.history.pushState({}, "", "/pagar/1234567");
    render(<Pagar />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeTruthy();
    // The shell's menu only sets the hash; from the customer path that must move the origin into the app.
    window.location.hash = "cierre";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // The shell reads the path next: it must already be the app origin.
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#cierre");
  });
});
