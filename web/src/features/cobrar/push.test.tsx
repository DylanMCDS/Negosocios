import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Cobrar from "./index";

const order = {
  id: "1234567", business_id: "rosa", amount_cents: 10000, concept: "Cobro", currency: "MXN", status: "pending", idempotency_key: "k",
  codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z", expires_at: "2026-11-26T18:10:00Z", paid_at: null,
  reconciliation_required: false, reconciliation_reason: null, demo_data: false,
};
let calls: Array<{ url: string; method: string; body?: string }>;
let pushStatus: number;
beforeEach(() => {
  calls = [];
  pushStatus = 200;
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body as string | undefined });
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url === "/api/orders" && method === "POST") return json(order, 201);
    if (url === "/api/orders/1234567/push") return pushStatus === 200 ? json({ sent: true, transaction_id: "tx", phone_last4: "5678" }) : json({ detail: "x" }, pushStatus);
    return json({ order });
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function chargeOneHundred() {
  for (const d of ["1", "0", "0"]) fireEvent.click(screen.getByRole("button", { name: d }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
  });
}

it("sends_the_charge_to_the_customers_phone_next_to_the_qr", async () => {
  render(<Cobrar />);
  await chargeOneHundred();
  await userEvent.click(await screen.findByRole("button", { name: "Enviar al celular del cliente" }));
  const send = screen.getByRole("button", { name: "Enviar" });
  expect(send).toBeDisabled(); // needs exactly 10 digits
  await userEvent.type(screen.getByLabelText("Celular del cliente (10 dígitos)"), "55 1234 5678");
  expect(send).toBeEnabled();
  await userEvent.click(send);
  const push = calls.find((c) => c.url === "/api/orders/1234567/push")!;
  expect(JSON.parse(push.body!)).toEqual({ phone: "5512345678" });
  expect(await screen.findByText(/Enviamos el cobro al celular terminado en 5678/)).toBeInTheDocument();
});

it("shows_a_clear_error_when_the_push_fails", async () => {
  pushStatus = 502;
  render(<Cobrar />);
  await chargeOneHundred();
  await userEvent.click(await screen.findByRole("button", { name: "Enviar al celular del cliente" }));
  await userEvent.type(screen.getByLabelText("Celular del cliente (10 dígitos)"), "5512345678");
  await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
  expect(await screen.findByText("No pudimos enviar el cobro al celular. Muestra el QR.")).toBeInTheDocument();
});
