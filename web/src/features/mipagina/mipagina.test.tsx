import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, it, expect, vi } from "vitest";
import MiPagina from "./index";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("editor_saves_menu_and_description_with_live_preview", async () => {
  localStorage.setItem("negosocios.business_id", "puesto-activo");
  let profile = { business_id: "puesto-activo", name: "Mi puesto", category: "Comida", zone: "Centro", description: "Inicial", cover: "toldo", menu: [{ name: "Tacos", price_cents: 5000, featured: false }], whatsapp: null, schedule: {}, open_now: false, demo_data: false, promotions: [], allies: [], reputation: { rating: null, reviews_count: 0, endorsements: 0 }, reviews: [] };
  const saved: Record<string, unknown>[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      expect(url).toBe("/api/profile/puesto-activo");
      const body = JSON.parse(String(init.body)); saved.push(body); profile = { ...profile, ...body };
    }
    return new Response(JSON.stringify(profile), { status: 200 });
  }));
  render(<MiPagina />);
  const description = await screen.findByLabelText("Descripción corta");
  fireEvent.change(description, { target: { value: "Comida hecha cada mañana" } });
  await userEvent.click(screen.getByRole("button", { name: "Menú" }));
  expect(screen.getByText("Comida hecha cada mañana")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Precio 1 (MXN)"), { target: { value: "65.50" } });
  await userEvent.click(screen.getByRole("button", { name: "Guardar página" }));
  await waitFor(() => expect(saved).toEqual([expect.objectContaining({ description: "Comida hecha cada mañana", menu: [{ name: "Tacos", price_cents: 6550, featured: false }] })]));
  expect(await screen.findByText("Página guardada.")).toBeInTheDocument();
});
