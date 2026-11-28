import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const order = (cents: number, id = "1234567") => ({
  id, business_id: "rosa", amount_cents: cents, concept: "Cobro", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z",
  expires_at: "2099-11-26T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getByRole("button", { name: k })));
const hero = () => screen.getByText("Importe").parentElement!.textContent;

describe("Cobrar: lo que se teclea se ve", () => {
  it("amount_display_shows_partial_cents_while_typing", () => {
    render(<Cobrar />);
    press("0");
    expect(hero()).toContain("$0");
    press(".");
    expect(hero()).toContain("$0.__");
    press("0");
    expect(hero()).toContain("$0.0_");
    expect(hero()).not.toContain("$0.00");
    press("1");
    expect(hero()).toContain("$0.01");
  });
});

describe("Cobrar: cobros pendientes y Dividir", () => {
  const charged = async () => {
    fetchMock.mockImplementation((_u: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order(5000), 201) : json({ order: order(5000) }),
    );
    render(<Cobrar />);
    press("5", "0");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
    });
  };

  it("pending_orders_are_listed_on_return", async () => {
    await charged();
    expect(screen.getByRole("img", { name: /código qr/i })).toBeInTheDocument();
    cleanup();
    fetchMock.mockImplementation(() => json({ order: order(5000) }));
    render(<Cobrar />);
    expect(await screen.findByText(/Tienes 1 cobro pendiente/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cierre/i })).toHaveAttribute("href", "#cierre");
    fireEvent.click(screen.getByRole("button", { name: /\$50\.00/ }));
    await waitFor(() => expect(screen.getByRole("img", { name: /código qr/i })).toBeInTheDocument());
  });

  it("split_button_opens_dividir_with_order", async () => {
    await charged();
    const split = screen.getByRole("button", { name: /dividir este cobro/i });
    fireEvent.click(split);
    expect(window.location.hash).toBe("#dividir/1234567");
  });

  it("split_button_hidden_for_one_cent", async () => {
    fetchMock.mockImplementation((_u: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order(1), 201) : json({ order: order(1) }),
    );
    render(<Cobrar />);
    press("0", ".", "0", "1");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
    });
    expect(screen.queryByRole("button", { name: /dividir este cobro/i })).toBeNull();
  });

  it("referral_field_explains_origin", () => {
    render(<Cobrar />);
    expect(screen.getByText("Te lo da tu cliente; viene de un negocio aliado")).toBeInTheDocument();
  });

  it("open_payment_page_link_uses_hash_route", async () => {
    await charged();
    expect(screen.getByRole("link", { name: /abrir página de pago/i })).toHaveAttribute("href", "#pagar/1234567");
  });
});
