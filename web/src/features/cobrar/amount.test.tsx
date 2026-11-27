import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";
import { toCents } from "./amount";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const order = (cents: number) => ({
  id: "1234567", business_id: "rosa", amount_cents: cents, concept: "Cobro", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z",
  expires_at: "2026-11-26T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getByRole("button", { name: k })));
const hero = () => screen.getByText("Importe").parentElement!.textContent;

describe("Teclado de importe", () => {
  it("converts_text_amount_to_cents_without_float_error", () => {
    const cases: Array<[string, number]> = [["19.99", 1999], ["0.1", 10], ["35.5", 3550], ["0.01", 1], [".5", 50], ["0.50", 50], ["35", 3500], ["", 0], [".", 0], ["1234.56", 123456]];
    for (const [text, cents] of cases) expect(toCents(text), text).toBe(cents);
  });

  it("keypad_accepts_two_decimals", () => {
    render(<Cobrar />);
    press("3", "5", ".", "5", "0");
    expect(hero()).toContain("$35.50");
    press("Borrar", "Borrar", "Borrar", "Borrar", "Borrar");
    press(".", "5");
    expect(hero()).toContain("$0.50");
  });

  it("keypad_rejects_second_dot_and_third_decimal", () => {
    render(<Cobrar />);
    press("1", ".", "2", ".", "3", "4", "5");
    expect(hero()).toContain("$1.23");
    expect(hero()).not.toContain("$1.234");
  });

  it("charges_one_cent_minimum", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order(1), 201) : json({ order: order(1) }),
    );
    render(<Cobrar />);
    const charge = screen.getByRole("button", { name: /^cobrar$/i });
    expect(charge).toBeDisabled();
    press("0", ".", "0", "1");
    expect(hero()).toContain("$0.01");
    expect(charge).toBeEnabled();
    await act(async () => {
      fireEvent.click(charge);
    });
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1].body as string).amount_cents).toBe(1);
  });
});
