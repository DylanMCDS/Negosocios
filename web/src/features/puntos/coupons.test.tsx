import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { api, ApiError } from "../../lib/api";
import { COUPON_STORAGE_KEY } from "../cupones";
import { PublicPoint } from "./index";

vi.mock("../../lib/api", async (original) => ({
  ...await original<typeof import("../../lib/api")>(), api: vi.fn(),
}));
afterEach(() => { cleanup(); localStorage.clear(); vi.resetAllMocks(); });

const issuer = { id: "ana", name: "Pan de Ana", demo_data: true };
const partner = { id: "luna", name: "Café Luna", demo_data: true };
const point = { id: "sticker", kind: "cashier", label: "Caja", active: true, path: "/p/sticker", demo_data: true, pending_count: 0 };
const alliance = { id: "al-1", status: "active", giver: "ana", role: "giver", partner_id: "luna", partner_name: "Café Luna" };
const coupon = {
  token: "coupon-new", alliance_id: "al-1", status: "valid", issuer: { id: "ana", name: "Pan de Ana" },
  redeem_at: { id: "luna", name: "Café Luna" }, discount_pct: 10, expires_at: "2026-12-05T18:00:00+00:00", demo_data: true,
};

it("sticker_at_issuing_business_saves_coupon_when_paid", async () => {
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (path.startsWith("/points/sticker/resolve")) return { point, business: issuer, mode: "empty", orders: [], url: "/p/sticker" };
    if (path.startsWith("/alliances")) return [alliance];
    if (path === "/coupons/claim") { expect(JSON.parse(String(init?.body))).toEqual({ alliance_id: "al-1", point_id: "sticker" }); return coupon; }
    throw new Error(`unexpected ${path}`);
  });
  render(<PublicPoint token="sticker" />);
  expect(await screen.findByText("Guardaste un cupón para Café Luna")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "null")).toEqual(["coupon-new"]);
  expect(screen.getByRole("link", { name: "Ver mis cupones" })).toHaveAttribute("href", "#cupones");
});

it("sticker_without_paid_order_explains_and_saves_nothing", async () => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.startsWith("/points/sticker/resolve")) return { point, business: issuer, mode: "empty", orders: [], url: "/p/sticker" };
    if (path.startsWith("/alliances")) return [alliance];
    if (path === "/coupons/claim") throw new ApiError(409, "Aún no hay una compra pagada en este negocio");
    throw new Error(`unexpected ${path}`);
  });
  render(<PublicPoint token="sticker" />);
  expect(await screen.findByText("Aún no hay una compra pagada en este negocio")).toBeInTheDocument();
  expect(screen.getByText("No guardamos ningún cupón.")).toBeInTheDocument();
  expect(screen.queryByText(/Guardaste un cupón/)).not.toBeInTheDocument();
  expect(localStorage.getItem(COUPON_STORAGE_KEY)).toBeNull();
});

it("point_at_partner_business_applies_valid_coupon_automatically", async () => {
  localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(["coupon-new"]));
  vi.mocked(api).mockImplementation(async (path) => {
    if (path.startsWith("/points/sticker/resolve")) return { point, business: partner, mode: "payment", url: "/pagar/o1",
      orders: [{ id: "o1", concept: "Café y pan", amount_cents: 10000, url: "/pagar/o1" }] };
    if (path.startsWith("/alliances")) return [{ ...alliance, role: "referrer", giver: "ana" }];
    if (path === "/coupons/coupon-new") return coupon;
    throw new Error(`unexpected ${path}`);
  });
  render(<PublicPoint token="sticker" />);
  expect(await screen.findByText("Cupón aplicado: 10% de Pan de Ana")).toBeInTheDocument();
  expect(screen.getByText("Pagarías $90.00 en lugar de $100.00")).toBeInTheDocument();
  expect(vi.mocked(api).mock.calls.some(([path]) => path === "/coupons/claim")).toBe(false);
});
