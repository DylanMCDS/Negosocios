import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const lupita = { id: "b-9", name: "Café Lupita", category: "Café", zone: "Centro", temporary_location: null, location_expires_at: null, demo_data: false };
const order = (businessId: string) => ({
  id: "1234567", business_id: businessId, amount_cents: 10000, concept: "Café", currency: "MXN", status: "pending",
  idempotency_key: "k", codi_qr_id: "qr-1", qr_string: "000201CODI", created_at: "2026-11-26T18:00:00Z",
  expires_at: "2026-11-26T18:10:00Z", paid_at: null, reconciliation_required: false, reconciliation_reason: null, demo_data: false,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function charge() {
  for (const d of ["1", "0", "0"]) fireEvent.click(screen.getByRole("button", { name: d }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^cobrar$/i }));
  });
}
const postBody = () => {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
  return JSON.parse(call![1].body as string);
};

describe("Puesto activo en Cobrar", () => {
  it("cobrar_uses_business_saved_by_alta", async () => {
    localStorage.setItem("negosocios.business_id", "b-9");
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order("b-9"), 201) : url === "/api/businesses/b-9" ? json(lupita) : json({ order: order("b-9"), business: lupita }),
    );
    render(<Cobrar />);
    expect(await screen.findByText(/Café Lupita/)).toBeInTheDocument();
    await charge();
    expect(postBody().business_id).toBe("b-9");
  });

  it("cobrar_falls_back_to_rosa_when_saved_business_missing", async () => {
    localStorage.setItem("negosocios.business_id", "gone");
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(order("rosa"), 201) : url === "/api/businesses/gone" ? json({ detail: "no existe" }, 404) : json({ order: order("rosa"), business: lupita }),
    );
    render(<Cobrar />);
    expect(await screen.findByText(/Puesto de ejemplo/)).toBeInTheDocument();
    await charge();
    expect(postBody().business_id).toBe("rosa");
  });
});
