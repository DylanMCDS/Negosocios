import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dividir from "./index";

const order = (over: Record<string, unknown> = {}) => ({
  id: "1234567", business_id: "rosa", amount_cents: 10001, concept: "Cena de tacos", currency: "MXN",
  status: "pending", idempotency_key: "k", codi_qr_id: "qr-0", qr_string: "000201FULL", created_at: "2026-11-27T18:00:00Z",
  expires_at: "2026-11-27T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null,
  demo_data: false, ...over,
});
const business = { id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis", temporary_location: null, location_expires_at: null, demo_data: false };
const closing = { currency: "MXN", confirmed_sales_cents: 0, expenses_cents: 0, estimated_profit_cents: 0, pending: [order()], pending_cents: 10001, missing: [] };
const part = (idx: number, cents: number, status = "pending") => ({
  idx, amount_cents: cents, status, paid_at: status === "paid" ? "2026-11-27T18:02:00Z" : null,
  codi_qr_id: `qr-${idx}`, qr_string: `000201PART${idx}`,
});
const split = (paid: number[] = []) => {
  const parts = [part(1, 3335, paid.includes(1) ? "paid" : "pending"), part(2, 3333, paid.includes(2) ? "paid" : "pending"), part(3, 3333, paid.includes(3) ? "paid" : "pending")];
  return {
    order_id: "1234567", currency: "MXN", parts, total_cents: 10001,
    paid_cents: parts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0),
    missing: parts.filter((p) => p.status !== "paid").map((p) => p.idx),
  };
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

let calls: Array<{ url: string; method: string; body?: string }>;
let current: ReturnType<typeof split> | null;
function serve() {
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.startsWith("/api/closing/today")) return json(closing);
    if (url === "/api/orders/1234567/split" && method === "POST") {
      current = split();
      return json(current, 201);
    }
    if (url === "/api/orders/1234567/split") return current ? json(current) : json({ detail: "no" }, 404);
    if (url === "/api/orders/1234567") return json({ order: order(), business });
    return json({}, 404);
  }));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  calls = [];
  current = null;
  window.location.hash = "#dividir";
  serve();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Dividir", () => {
  it("lists_pending_charges_to_split", async () => {
    render(<Dividir />);
    expect(await screen.findByText("Cena de tacos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dividir/i })).toBeInTheDocument();
  });

  it("previews_equal_parts_with_the_remainder_on_the_first", async () => {
    window.location.hash = "#dividir/1234567";
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    await userEvent.click(screen.getByRole("button", { name: /más partes/i }));  // 2 -> 3
    expect(screen.getByText("$33.35")).toBeInTheDocument();
    expect(screen.getAllByText("$33.33")).toHaveLength(2);
  });

  it("posts_the_split_and_shows_a_qr_per_part", async () => {
    window.location.hash = "#dividir/1234567";
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    await userEvent.click(screen.getByRole("button", { name: /más partes/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /crear cobros/i }));
    });
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/orders/1234567/split");
    expect(JSON.parse(post.body!)).toEqual({ parts: 3 });
    expect(await screen.findAllByRole("img", { name: /código qr de la parte/i })).toHaveLength(3);
  });

  it("shows_who_is_missing_and_updates_when_a_part_is_paid", async () => {
    window.location.hash = "#dividir/1234567";
    current = split();
    render(<Dividir />);
    expect(await screen.findByText(/faltan 3 de 3/i)).toBeInTheDocument();
    current = split([1]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(await screen.findByText(/faltan 2 de 3/i)).toBeInTheDocument();
    expect(screen.getAllByText("Pagado")).toHaveLength(1);
    current = split([1, 2, 3]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(await screen.findByText(/cobro completo/i)).toBeInTheDocument();
  });

  it("custom_amounts_must_sum_to_the_total", async () => {
    window.location.hash = "#dividir/1234567";
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    await userEvent.click(screen.getByRole("button", { name: /montos distintos/i }));
    const inputs = screen.getAllByLabelText(/importe de la parte/i);
    fireEvent.change(inputs[0], { target: { value: "50" } });
    fireEvent.change(inputs[1], { target: { value: "40" } });
    expect(screen.getByText(/faltan \$10\.01/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear cobros/i })).toBeDisabled();
    fireEvent.change(inputs[1], { target: { value: "50.01" } });
    expect(screen.getByRole("button", { name: /crear cobros/i })).toBeEnabled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /crear cobros/i }));
    });
    expect(JSON.parse(calls.find((c) => c.method === "POST")!.body!)).toEqual({ amounts_cents: [5000, 5001] });
  });

  it("part_page_shows_receiver_amount_and_qr", async () => {
    window.location.hash = "#dividir/1234567/2";
    current = split();
    render(<Dividir />);
    expect(await screen.findByText("Tacos de Doña Rosa")).toBeInTheDocument();
    expect(screen.getByText("$33.33")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /código qr de la parte 2/i })).toBeInTheDocument();
    expect(screen.getByText(/parte 2 de 3/i)).toBeInTheDocument();
  });

  it("shows_a_clear_error_when_the_split_fails", async () => {
    window.location.hash = "#dividir/1234567";
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ detail: "x" }, 502) : url === "/api/orders/1234567/split" ? json({}, 404) : url === "/api/orders/1234567" ? json({ order: order(), business }) : json(closing)));
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /crear cobros/i }));
    });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no pudimos crear/i));
  });
});
