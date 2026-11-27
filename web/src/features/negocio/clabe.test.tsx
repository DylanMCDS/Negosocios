import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Negocio from "./index";

const VALID = "002010077777777771";
const business = {
  id: "b-1", name: "Tacos Lupita", category: "Tacos", zone: "Tianguis",
  temporary_location: null, location_expires_at: null, demo_data: false,
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

let calls: Array<{ url: string; method: string; body?: string }>;
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  calls = [];
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
    if (url.includes("/payout-account")) return json({ bank: "Banamex", last4: "7771", simulated: true, label: "cuenta simulada" });
    return init?.method === "POST" ? json(business, 201) : json(business);
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function fillBasics() {
  fireEvent.change(screen.getByLabelText("Nombre del puesto"), { target: { value: "Tacos Lupita" } });
  fireEvent.change(screen.getByLabelText("Giro"), { target: { value: "Tacos" } });
  fireEvent.change(screen.getByLabelText("Zona"), { target: { value: "Tianguis" } });
  await userEvent.click(screen.getByRole("checkbox"));
}

describe("Alta: CLABE opcional", () => {
  it("alta_offers_optional_clabe_labeled_as_simulated", () => {
    render(<Negocio />);
    expect(screen.getByLabelText(/CLABE donde recibes tus cobros/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulado en esta demo/i)).toBeInTheDocument();
  });

  it("alta_saves_a_valid_clabe_after_creating_the_business", async () => {
    render(<Negocio />);
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/CLABE donde recibes tus cobros/i), { target: { value: VALID } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    });
    await waitFor(() => expect(calls.some((c) => c.url === "/api/businesses/b-1/payout-account")).toBe(true));
    const put = calls.find((c) => c.url === "/api/businesses/b-1/payout-account")!;
    expect(put.method).toBe("PUT");
    expect(JSON.parse(put.body!)).toEqual({ clabe: VALID });
    expect(calls[0].url).toBe("/api/businesses");
  });

  it("alta_blocks_a_clabe_with_a_wrong_check_digit", async () => {
    render(<Negocio />);
    await fillBasics();
    fireEvent.change(screen.getByLabelText(/CLABE donde recibes tus cobros/i), { target: { value: VALID.slice(0, 17) + "2" } });
    expect(screen.getByText(/dígito de control/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });

  it("alta_still_works_without_a_clabe", async () => {
    render(<Negocio />);
    await fillBasics();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    });
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(calls.some((c) => c.url.includes("/payout-account"))).toBe(false);
  });
});
