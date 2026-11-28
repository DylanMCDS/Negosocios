import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Cobrar from "./index";

const view = (over: Record<string, unknown> = {}) => ({
  token: "tok123", alliance_id: "al-1", status: "valid", issuer: { id: "cafe", name: "Café Soledad" }, redeem_at: { id: "rosa", name: "Tacos de Doña Rosa" },
  discount_pct: 10, expires_at: "2099-01-01T00:00:00Z", demo_data: true, ...over,
});
const order = (cents: number) => ({
  id: "1234567", business_id: "rosa", amount_cents: cents, concept: "Cobro", currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z", expires_at: "2099-11-26T18:10:00Z", paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
const alliance = { id: "al-1", status: "active", giver: "rosa", giver_name: "Tacos de Doña Rosa", discount_pct: 10, referral_code: "ABCD1234", budget_remaining_cents: 9000, uses_remaining: 4 };

let calls: Array<{ url: string; method: string; body?: string; headers?: Record<string, string> }>;
let couponView: Record<string, unknown>;
let redeemReply: { status: number; body: unknown };
beforeEach(() => {
  calls = [];
  localStorage.clear();
  couponView = view();
  redeemReply = { status: 200, body: { applied: true, original_cents: 10000, discount_cents: 1000, total_cents: 9000, currency: "MXN", demo_data: true } };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined, headers: init?.headers as Record<string, string> | undefined });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url === "/api/coupons/tok123/redeem") return json(redeemReply.body, redeemReply.status);
    if (url === "/api/coupons/tok123") return json(couponView);
    if (url === "/api/alliances/code/ABCD1234") return json(alliance);
    if (url === "/api/alliances/al-1/quote") return json({ applied: true, original_cents: 10000, discount_cents: 1000, total_cents: 9000, reason: null });
    if (url === "/api/orders" && method === "POST") return json(order(9000), 201);
    return json({ order: order(9000) });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const type = (digits: string) => { for (const d of digits) fireEvent.click(screen.getByRole("button", { name: d })); };

it("scan_coupon_button_next_to_alliance_code", () => {
  render(<Cobrar />);
  expect(screen.getByLabelText("Cliente referido por (código)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Escanear cupón" })).toBeInTheDocument();
});

it("scan_falls_back_to_typed_code_without_camera", async () => {
  render(<Cobrar />);
  await userEvent.click(screen.getByRole("button", { name: "Escanear cupón" }));
  expect(await screen.findByText(/escribe o pega el código del cupón/i)).toBeInTheDocument();
  expect(screen.getByLabelText("Código del cupón")).toBeInTheDocument();
});

it("scanned_coupon_shows_discount_before_confirm", async () => {
  class Detector { async detect() { return [{ rawValue: "https://negosocios.example/cupon/tok123" }]; } }
  vi.stubGlobal("BarcodeDetector", Detector);
  vi.stubGlobal("HTMLMediaElement", Object.assign(HTMLMediaElement, {}));
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) } });
  render(<Cobrar />);
  type("100");
  await userEvent.click(screen.getByRole("button", { name: "Escanear cupón" }));
  expect(await screen.findByText("Cupón de Café Soledad")).toBeInTheDocument();
  expect(screen.getByText(/10 %/)).toBeInTheDocument();
  expect(screen.getByText("Total $90.00")).toBeInTheDocument();
  expect(calls.some((c) => c.url.endsWith("/redeem"))).toBe(false); // nothing is applied before confirming
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

it("typed_coupon_applies_on_confirm_and_charges_the_total", async () => {
  render(<Cobrar />);
  type("100");
  await userEvent.click(screen.getByRole("button", { name: "Escanear cupón" }));
  await userEvent.type(await screen.findByLabelText("Código del cupón"), "tok123");
  await userEvent.click(screen.getByRole("button", { name: "Ver cupón" }));
  expect(await screen.findByText("Total $90.00")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Aplicar cupón" }));
  const redeem = await waitFor(() => { const c = calls.find((x) => x.url === "/api/coupons/tok123/redeem"); expect(c).toBeTruthy(); return c!; });
  expect(JSON.parse(redeem.body!)).toMatchObject({ business_id: "rosa", amount_cents: 10000 });
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: /^cobrar$/i })); });
  const post = calls.find((c) => c.url === "/api/orders")!;
  expect(JSON.parse(post.body!).amount_cents).toBe(9000);
  expect(JSON.parse(redeem.body!).order_id).toBe(post.headers!["Idempotency-Key"]);
});

it("coupon_errors_show_spanish_reason", async () => {
  redeemReply = { status: 409, body: { detail: "Este cupón ya se usó" } };
  render(<Cobrar />);
  type("100");
  await userEvent.click(screen.getByRole("button", { name: "Escanear cupón" }));
  await userEvent.type(await screen.findByLabelText("Código del cupón"), "tok123");
  await userEvent.click(screen.getByRole("button", { name: "Ver cupón" }));
  await userEvent.click(await screen.findByRole("button", { name: "Aplicar cupón" }));
  expect(await screen.findByText("Este cupón ya se usó")).toBeInTheDocument();
  expect(screen.getByText("$100.00")).toBeInTheDocument(); // the charge is not lost
  expect(screen.getByRole("button", { name: /^cobrar$/i })).toBeEnabled();
});

it("coupon_expired_or_foreign_is_explained_before_confirm", async () => {
  couponView = view({ status: "expired" });
  render(<Cobrar />);
  type("100");
  await userEvent.click(screen.getByRole("button", { name: "Escanear cupón" }));
  await userEvent.type(await screen.findByLabelText("Código del cupón"), "tok123");
  await userEvent.click(screen.getByRole("button", { name: "Ver cupón" }));
  expect(await screen.findByText("Venció")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Aplicar cupón" })).not.toBeInTheDocument();
});

it("manual_alliance_code_still_works", async () => {
  render(<Cobrar />);
  type("100");
  await userEvent.type(screen.getByLabelText("Cliente referido por (código)"), "abcd1234");
  await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(await screen.findByText("Total $90.00")).toBeInTheDocument();
});
