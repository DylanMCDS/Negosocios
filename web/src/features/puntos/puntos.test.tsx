import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { api } from "../../lib/api";
import Puntos, { PublicPoint } from "./index";

vi.mock("../../lib/api", () => ({ api: vi.fn() }));
vi.mock("../../lib/business", () => ({ resolveActiveBusiness: async () => ({ id: "rosa", name: "Tacos de Rosa" }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); delete document.body.dataset.printPoint; });

const business = { id: "rosa", name: "Tacos de Rosa", demo_data: true };
const point = { id: "point-token", kind: "cashier", label: "Caja principal", active: true, path: "/p/point-token", demo_data: true, pending_count: 0 };

describe("Puntos", () => {
  it("shows_receiver_and_requires_choosing_between_pending_orders", async () => {
    vi.mocked(api).mockResolvedValue({ point, business, mode: "choose", orders: [
      { id: "one", concept: "Mesa 1", amount_cents: 3550, url: "/pagar/one" },
      { id: "two", concept: "Mesa 2", amount_cents: 10000, url: "/pagar/two" },
    ] });
    render(<PublicPoint token="point-token" />);
    expect(await screen.findByRole("heading", { name: "Elige tu cobro" })).toBeInTheDocument();
    expect(screen.getByText("Tacos de Rosa")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mesa 1/ })).toHaveAttribute("href", "/pagar/one");
    expect(screen.getByRole("link", { name: /Mesa 2/ })).toHaveAttribute("href", "/pagar/two");
    expect(screen.getByText("Datos de ejemplo")).toBeInTheDocument();
  });

  it("shows_revoked_message_without_a_payment_link", async () => {
    vi.mocked(api).mockRejectedValue(new Error("410 Gone"));
    render(<PublicPoint token="revoked" />);
    expect(await screen.findByRole("heading", { name: "Este punto ya no está activo" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver cobro/ })).not.toBeInTheDocument();
  });

  it("creates_printable_qr_and_explains_three_nfc_steps", async () => {
    const points: typeof point[] = [];
    vi.mocked(api).mockImplementation(async (path, init) => {
      if (path.startsWith("/points/pending-orders")) return [];
      if (init?.method === "POST") { points.push(point); return point; }
      return { business, points: [...points] };
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<Puntos />);
    fireEvent.change(await screen.findByLabelText("Nombre del punto"), { target: { value: "Caja principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear punto" }));
    expect(await screen.findByRole("img", { name: "QR del punto Caja principal" })).toBeInTheDocument();
    expect(screen.getByLabelText("URL del punto")).toHaveValue(`${window.location.origin}/p/point-token`);
    expect(screen.getByRole("link", { name: "Guía de NFC Tools" })).toHaveAttribute("href", expect.stringContaining("wakdev.com"));
    expect(screen.getByRole("list", { name: "Grabar en NFC" }).children).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir QR" }));
    expect(print).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.querySelector("[data-point-print]")).toHaveTextContent("Tacos de Rosa"));
    print.mockRestore();
  });

  it("prints_one_isolated_sticker_and_cleans_up_after_printing", async () => {
    vi.mocked(api).mockImplementation(async (path) => path.startsWith("/points/pending-orders") ? [] : { business, points: [point] });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    try {
      render(<Puntos />);
      await screen.findByRole("img", { name: "QR del punto Caja principal" });
      fireEvent.click(screen.getByRole("button", { name: "Imprimir QR" }));
      expect(document.querySelectorAll("[data-point-print-copy]")).toHaveLength(1);
      expect(document.querySelector("[data-point-print-copy]")).toHaveTextContent("Tacos de Rosa");
      fireEvent(window, new Event("afterprint"));
      expect(document.querySelectorAll("[data-point-print-copy]")).toHaveLength(0);
      expect(document.body.dataset.printPoint).toBeUndefined();
      expect(screen.getByRole("img", { name: "QR del punto Caja principal" })).toBeInTheDocument();
    } finally { print.mockRestore(); }
  });
});
