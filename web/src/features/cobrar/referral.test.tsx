import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Cobrar from "./index";

const alliance = { id: "al-1", status: "active", giver: "rosa", giver_name: "Tacos de Doña Rosa", discount_pct: 10, referral_code: "ABCD1234", budget_remaining_cents: 9000, uses_remaining: 4 };
const order = (cents: number) => ({
  id: "1234567", business_id: "rosa", amount_cents: cents, concept: "Cobro", currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z", expires_at: "2026-11-26T18:10:00Z", paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
let calls: Array<{ url: string; method: string; body?: string; headers?: Record<string, string> }>;
beforeEach(() => {
  calls = [];
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined, headers: init?.headers as Record<string, string> | undefined });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url === "/api/alliances/code/ABCD1234") return json(alliance);
    if (url === "/api/alliances/code/NOPE") return json({ detail: "no" }, 404);
    if (url === "/api/alliances/al-1/quote") return json({ applied: true, original_cents: 10000, discount_cents: 1000, total_cents: 9000, budget_remaining_cents: 8000, uses_remaining: 3, reason: null, currency: "MXN" });
    if (url === "/api/orders" && method === "POST") return json(order(9000), 201);
    return json({ order: order(9000) });
  }));
});
afterEach(() => vi.unstubAllGlobals());

it("cobrar_applies_referral_discount_before_qr", async () => {
  render(<Cobrar />);
  for (const d of ["1", "0", "0"]) fireEvent.click(screen.getByRole("button", { name: d }));
  await userEvent.type(screen.getByLabelText("Cliente referido por (código)"), "abcd1234");
  await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(await screen.findByText("Precio $100.00")).toBeInTheDocument();
  expect(screen.getByText("Descuento del aliado −$10.00")).toBeInTheDocument();
  expect(screen.getByText("Total $90.00")).toBeInTheDocument();
  expect(calls.some((c) => c.url === "/api/orders")).toBe(false); // nothing is charged yet
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
  });
  const quote = calls.find((c) => c.url === "/api/alliances/al-1/quote")!;
  const post = calls.find((c) => c.url === "/api/orders")!;
  expect(calls.indexOf(quote)).toBeLessThan(calls.indexOf(post)); // the benefit is reserved before the QR exists
  expect(JSON.parse(quote.body!)).toMatchObject({ amount_cents: 10000 });
  expect(JSON.parse(post.body!).amount_cents).toBe(9000); // the QR is for the total with discount
  expect(JSON.parse(quote.body!).order_id).toBe(post.headers!["Idempotency-Key"]);
});

it("rejects_unknown_or_foreign_referral_codes", async () => {
  render(<Cobrar />);
  await userEvent.type(screen.getByLabelText("Cliente referido por (código)"), "NOPE");
  await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(await screen.findByText("Código no encontrado")).toBeInTheDocument();
});
