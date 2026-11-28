import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Cierre from "./index";

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const order = (id: string, concept: string, expires: string) => ({
  id, business_id: "rosa", amount_cents: 8400, concept, currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr", qr_string: "000201", created_at: "2026-11-28T10:00:00Z", expires_at: expires, paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
afterEach(() => vi.unstubAllGlobals());

describe("Cierre con cobros vencidos", () => {
  it("cierre_marks_expired_pending_with_chip", async () => {
    const pending = [order("1", "Cena vigente", hours(1)), order("2", "Cena vencida", hours(-1))];
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ currency: "MXN", confirmed_sales_cents: 20000, expenses_cents: 0, estimated_profit_cents: 20000, pending, pending_cents: 16800, missing: [] }), { status: 200 }),
    ));
    render(<Cierre />);
    const expired = (await screen.findByText("Cena vencida")).closest("li")!;
    expect(expired).toHaveTextContent("Venció");
    expect(expired).not.toHaveTextContent("Pendiente");
    expect(screen.getByText("Cena vigente").closest("li")).toHaveTextContent("Pendiente");
  });
});
