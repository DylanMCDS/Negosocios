import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { api, ApiError } from "../../lib/api";
import Cupones, { COUPON_STORAGE_KEY, saveCouponToken } from "./index";

vi.mock("../../lib/api", async (original) => ({
  ...await original<typeof import("../../lib/api")>(), api: vi.fn(),
}));
afterEach(() => { cleanup(); localStorage.clear(); vi.resetAllMocks(); });

const tokens = ["coupon-valid", "coupon-used", "coupon-expired"];
const states = new Map<string, string>();
const names = ["Café Luna", "Tacos de Rosa", "Jugos del Mercado"];
function serveWallet() {
  tokens.forEach((token, index) => states.set(token, ["valid", "used", "expired"][index]));
  localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(tokens));
  vi.mocked(api).mockImplementation(async (path) => {
    const token = decodeURIComponent(path.split("/").at(-1) ?? "");
    return {
      token, alliance_id: "alliance", status: states.get(token),
      issuer: { id: "issuer", name: "Pan de Ana" },
      redeem_at: { id: token, name: names[tokens.indexOf(token)] },
      discount_pct: 10, expires_at: "2026-12-05T18:00:00+00:00", demo_data: true,
    };
  });
}

it("wallet_lists_saved_coupons_with_status", async () => {
  serveWallet();
  render(<Cupones />);
  const list = await screen.findByRole("list", { name: "Tus cupones" });
  expect(within(list).getByText("Café Luna")).toBeInTheDocument();
  expect(within(list).getByText("Tacos de Rosa")).toBeInTheDocument();
  expect(within(list).getByText("Jugos del Mercado")).toBeInTheDocument();
  expect(within(list).getByText("Vigente")).toBeInTheDocument();
  expect(within(list).getByText("Usado")).toBeInTheDocument();
  expect(within(list).getByText("Vencido")).toBeInTheDocument();
  expect(within(list).getAllByText(/10/)).toHaveLength(3);
  expect(screen.getAllByText(/5 de diciembre de 2026/).length).toBeGreaterThanOrEqual(3);
});

it("wallet_shows_qr_for_valid_coupon", async () => {
  serveWallet();
  render(<Cupones />);
  expect(await screen.findByRole("img", { name: "QR para canjear en Café Luna" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tacos de Rosa/ }));
  expect(screen.queryByRole("img", { name: /QR para canjear/ })).not.toBeInTheDocument();
  expect(screen.getByText("Este cupón ya se usó.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Jugos del Mercado/ }));
  expect(screen.queryByRole("img", { name: /QR para canjear/ })).not.toBeInTheDocument();
  expect(screen.getByText("Este cupón venció.")).toBeInTheDocument();
});

it("wallet_refreshes_server_status_without_persisting_coupon_details", async () => {
  serveWallet();
  render(<Cupones />);
  await screen.findByRole("img", { name: /Café Luna/ });
  states.set(tokens[0], "used");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await screen.findByText("Este cupón ya se usó.");
  expect(screen.queryByRole("img", { name: /QR para canjear/ })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null")).toEqual(tokens);
});

it("wallet_retry_preserves_tokens_when_server_cannot_verify_them", async () => {
  serveWallet();
  vi.mocked(api).mockRejectedValue(new ApiError(503, "Intenta otra vez más tarde"));
  render(<Cupones />);
  expect((await screen.findAllByText("Intenta otra vez más tarde")).length).toBeGreaterThan(0);
  expect(screen.queryByRole("img", { name: /QR para canjear/ })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null")).toEqual(tokens);
  serveWallet();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  expect(await screen.findByRole("img", { name: /Café Luna/ })).toBeInTheDocument();
});

it("wallet_saves_only_unique_tokens", () => {
  expect(saveCouponToken("coupon-token")).toBe(true);
  expect(saveCouponToken("coupon-token")).toBe(true);
  expect(JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null")).toEqual(["coupon-token"]);
  expect(saveCouponToken({ clabe: "private" } as unknown as string)).toBe(false);
  expect(JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null")).toEqual(["coupon-token"]);
});

it("wallet_handles_empty_and_corrupt_browser_data", async () => {
  localStorage.setItem(COUPON_STORAGE_KEY, "{invalid");
  render(<Cupones />);
  expect(await screen.findByText("Aún no tienes cupones guardados.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explorar negocios" })).toHaveAttribute("href", "#explorar");
});
