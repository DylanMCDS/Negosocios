import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const paid = {
  id: "1234567", business_id: "rosa", amount_cents: 5000, concept: "Cobro", currency: "MXN", status: "paid",
  idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-28T18:00:00Z",
  expires_at: "2099-11-28T18:10:00Z", paid_at: "2026-11-28T18:01:00Z", reconciliation_required: false,
  reconciliation_reason: null, demo_data: false,
};

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  vi.stubGlobal("fetch", vi.fn((_u: string, init?: RequestInit) => (init?.method === "POST" ? json(paid, 201) : json({ order: paid }))));
});
afterEach(() => vi.unstubAllGlobals());

describe("Cobrar: movimiento", () => {
  it("cobrar_pagado_overlay_uses_fade_in", async () => {
    render(<Cobrar />);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
    });
    const fade = screen.getByTestId("fade-in");
    expect(within(fade).getByText("Pagado")).toBeInTheDocument();
    expect(within(fade).getByRole("button", { name: /cobrar otra orden/i })).toBeInTheDocument();
  });
});
