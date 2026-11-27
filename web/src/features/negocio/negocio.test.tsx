import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "../../lib/types";
import Negocio from "./index";
import { BUSINESS_KEY } from "./businessId";

const business: Business = {
  id: "b-123", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis",
  temporary_location: "Pasillo de comida", location_expires_at: null, demo_data: false,
};

let calls: Array<{ url: string; method: string; body?: string }>;
beforeEach(() => {
  calls = [];
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
    if (url === "/api/businesses" && init?.method === "POST") return new Response(JSON.stringify(business), { status: 201 });
    if (url === `/api/businesses/${business.id}`) return new Response(JSON.stringify(business), { status: 200 });
    return new Response("{}", { status: 404 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function fillForm() {
  await userEvent.type(screen.getByLabelText("Nombre del puesto"), "Tacos de Doña Rosa");
  await userEvent.type(screen.getByLabelText("Giro"), "Tacos");
  await userEvent.type(screen.getByLabelText("Zona"), "Tianguis");
}

describe("Alta del puesto", () => {
  it("creates_business_with_three_fields", async () => {
    render(<Negocio />);
    await fillForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /Acepto/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("heading", { name: "Tacos de Doña Rosa" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/businesses");
    expect(JSON.parse(post.body!)).toEqual({ name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis" });
    expect(localStorage.getItem(BUSINESS_KEY)).toBe("b-123");
    expect(screen.getByRole("img", { name: /QR fijo/ })).toBeInTheDocument();
  });

  it("requires_consent_before_saving", async () => {
    render(<Negocio />);
    await fillForm();
    const save = screen.getByRole("button", { name: "Guardar" });
    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(calls).toHaveLength(0);
    await userEvent.click(screen.getByRole("checkbox", { name: /Acepto/ }));
    expect(save).toBeEnabled();
  });

  it("shows_public_profile", async () => {
    window.history.replaceState(null, "", "/?negocio=b-123");
    render(<Negocio />);
    expect(await screen.findByRole("heading", { name: "Tacos de Doña Rosa" })).toBeInTheDocument();
    expect(screen.getByText(/Tianguis/)).toBeInTheDocument();
    expect(screen.getByText(/Pasillo de comida/)).toBeInTheDocument();
    expect(screen.getByText("Paga aquí con CoDi")).toBeInTheDocument();
    await waitFor(() => expect(calls[0].url).toBe("/api/businesses/b-123"));
    expect(screen.queryByLabelText("Nombre del puesto")).not.toBeInTheDocument();
  });
});
