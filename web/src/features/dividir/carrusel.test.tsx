import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dividir from "./index";

const order = (cents: number) => ({
  id: "1234567", business_id: "rosa", amount_cents: cents, concept: "Cena de tacos", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-0", qr_string: "000201FULL", created_at: "2026-11-27T18:00:00Z",
  expires_at: "2026-11-27T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});
const business = { id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis", temporary_location: null, location_expires_at: null, demo_data: false };
const part = (idx: number, cents: number, paid: boolean) => ({
  idx, amount_cents: cents, status: paid ? "paid" : "pending", paid_at: paid ? "2026-11-27T18:02:00Z" : null,
  codi_qr_id: `qr-${idx}`, qr_string: `000201PART${idx}`,
});
const split = (paid: number[] = []) => {
  const parts = [part(1, 3335, paid.includes(1)), part(2, 3333, paid.includes(2)), part(3, 3333, paid.includes(3))];
  return {
    order_id: "1234567", currency: "MXN", parts, total_cents: 10001,
    paid_cents: parts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0),
    missing: parts.filter((p) => p.status !== "paid").map((p) => p.idx),
  };
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

let current: ReturnType<typeof split> | null;
let total: number;
let pushStatus: number;
let calls: Array<{ url: string; method: string; body?: string }>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  current = split();
  total = 10001;
  pushStatus = 200;
  calls = [];
  window.location.hash = "#dividir/1234567";
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.endsWith("/push")) return json(pushStatus === 200 ? { sent: true, phone_last4: "5678" } : { detail: "x" }, pushStatus);
    if (url === "/api/orders/1234567/split") return current ? json(current) : json({ detail: "no" }, 404);
    if (url === "/api/orders/1234567") return json({ order: order(total), business });
    return json({}, 404);
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe("Dividir: carrusel de partes", () => {
  it("parts_render_as_carousel_with_counter", async () => {
    render(<Dividir />);
    const carousel = await screen.findByRole("region", { name: /partes del cobro/i });
    expect(screen.getByText("Parte 1 de 3")).toBeInTheDocument();
    expect(within(carousel).getByText("$33.35")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /ir a la parte/i })).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: /parte siguiente/i }));
    expect(screen.getByText("Parte 2 de 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /parte anterior/i }));
    expect(screen.getByText("Parte 1 de 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /ir a la parte 3/i }));
    expect(screen.getByText("Parte 3 de 3")).toBeInTheDocument();
  });

  it("paid_part_advances_to_next_pending", async () => {
    render(<Dividir />);
    await screen.findByText("Parte 1 de 3");
    current = split([1]);
    await tick(3500);
    expect(await screen.findByText("Parte 1 pagada")).toBeInTheDocument();
    expect(screen.getByText("Parte 2 de 3")).toBeInTheDocument();
    expect(screen.getByText("Pagado ✓")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ir a la parte 1.*pagada/i })).toBeInTheDocument();
    current = split([1, 2, 3]);
    await tick(3500);
    const complete = (await screen.findByText("Cuenta completa")).closest("section") as HTMLElement;
    expect(within(complete).getByText("$100.01")).toBeInTheDocument();
  });

  it("part_can_be_requested_by_phone", async () => {
    render(<Dividir />);
    await screen.findByText("Parte 1 de 3");
    await userEvent.click(screen.getByRole("button", { name: /pedir por celular/i }));
    await userEvent.type(screen.getByLabelText(/celular/i), "5512345678");
    await userEvent.click(screen.getByRole("button", { name: /^enviar/i }));
    const push = calls.find((c) => c.url.endsWith("/push"))!;
    expect(push.url).toBe("/api/orders/1234567-1/push");
    expect(JSON.parse(push.body!)).toEqual({ phone: "5512345678" });
    expect(await screen.findByText(/terminado en 5678/)).toBeInTheDocument();
  });

  it("part_phone_request_failure_says_show_the_qr", async () => {
    pushStatus = 502;
    render(<Dividir />);
    await screen.findByText("Parte 1 de 3");
    await userEvent.click(screen.getByRole("button", { name: /pedir por celular/i }));
    await userEvent.type(screen.getByLabelText(/celular/i), "5512345678");
    await userEvent.click(screen.getByRole("button", { name: /^enviar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/muestra el qr/i);
  });

  it("disabled_create_explains_minimum_per_part", async () => {
    current = null;
    total = 1; // $0.01 cannot be split in two
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    expect(screen.getByRole("button", { name: /crear cobros/i })).toBeDisabled();
    expect(screen.getByText("Cada parte debe ser de al menos $0.01")).toBeInTheDocument();
  });

  it("max_parts_follows_the_amount", async () => {
    current = null;
    total = 3; // $0.03 -> at most 3 parts
    render(<Dividir />);
    await screen.findByText(/en cuántas partes/i);
    fireEvent.click(screen.getByRole("button", { name: /más partes/i }));
    expect(screen.getByRole("button", { name: /más partes/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /crear cobros/i })).toBeEnabled();
    expect(screen.queryByText("Cada parte debe ser de al menos $0.01")).toBeNull();
  });
});
