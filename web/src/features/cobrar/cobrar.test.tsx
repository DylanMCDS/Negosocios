import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";

const order = (over: Record<string, unknown> = {}) => ({
  id: "1234567",
  business_id: "rosa",
  amount_cents: 10000,
  concept: "Orden de tacos",
  currency: "MXN",
  status: "pending",
  idempotency_key: "k",
  codi_qr_id: "qr-1",
  qr_string: "000201CODI-DEMO-1234567",
  created_at: "2026-11-26T18:00:00Z",
  expires_at: "2026-11-26T18:10:00Z",
  paid_at: null,
  reconciliation_required: false,
  reconciliation_reason: null,
  demo_data: false,
  ...over,
});
const business = { id: "rosa", name: "Tacos de Doña Rosa" };
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function typeAndCharge() {
  for (const d of ["1", "0", "0"]) fireEvent.click(screen.getByRole("button", { name: d }));
  fireEvent.change(screen.getByLabelText(/concepto/i), { target: { value: "Orden de tacos" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
  });
}

describe("Cobrar", () => {
  it("shows_qr_after_creating_charge", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order(), 201) : json({ order: order(), business }),
    );
    render(<Cobrar />);
    await typeAndCharge();
    expect(await screen.findByRole("img", { name: /código qr/i })).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();
    expect(JSON.parse(init.body as string)).toMatchObject({ amount_cents: 10000, concept: "Orden de tacos", currency: "MXN" });
  });

  it("shows_paid_when_order_becomes_paid", async () => {
    let polls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return json(order(), 201);
      polls += 1;
      return json({ order: order(polls >= 2 ? { status: "paid", paid_at: "2026-11-26T18:01:00Z" } : {}), business });
    });
    render(<Cobrar />);
    await typeAndCharge();
    expect(screen.queryByText(/pagado \$100\.00/i)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(await screen.findByText(/pagado \$100\.00/i)).toBeTruthy();
  });

  it("shows_retry_when_charge_fails", async () => {
    fetchMock.mockImplementationOnce(() => json({ detail: "pey no disponible" }, 502));
    fetchMock.mockImplementationOnce(() => json(order(), 201));
    render(<Cobrar />);
    await typeAndCharge();
    expect(await screen.findByRole("alert")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    });
    const keys = fetchMock.mock.calls.filter((c) => c[1]?.method === "POST").map((c) => (c[1].headers as Record<string, string>)["Idempotency-Key"]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(await screen.findByRole("img", { name: /código qr/i })).toBeTruthy();
  });
});
