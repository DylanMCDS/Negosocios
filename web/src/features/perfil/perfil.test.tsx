import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import Perfil from "./index";

const profile = { business_id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Centro", description: "Tortillas hechas a mano", cover: "toldo", menu: [{ name: "Orden de tacos", price_cents: 6500, featured: true }], whatsapp: null, schedule: { fri: { open: "08:00", close: "17:00" } }, open_now: true, demo_data: true, promotions: [], allies: [], reputation: { rating: null, reviews_count: 0, endorsements: 0 }, reviews: [] };
afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ""; });

it("profile_page_shows_codi_badge_not_pay_button", async () => {
  window.location.hash = "#perfil/rosa";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(profile), { status: 200 })));
  render(<Perfil />);
  expect(await screen.findByRole("heading", { name: profile.name })).toBeInTheDocument();
  expect(screen.getByText("Aquí se paga con CoDi")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /pagar|cobrar/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /pagar|cobrar|whatsapp/i })).not.toBeInTheDocument();
  expect(screen.getByText("Orden de tacos")).toBeInTheDocument();
  expect(screen.getByText(/65.00/)).toBeInTheDocument();
  expect(screen.getByText("Datos de ejemplo")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /cómo llegar/i }).getAttribute("href")).toContain("Centro");
});

it("profile_hash_navigation_loads_the_next_business", async () => {
  window.location.hash = "#perfil/rosa";
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ ...profile, name: url.endsWith("/cafe") ? "Café cercano" : profile.name }), { status: 200 })));
  render(<Perfil />);
  await screen.findByRole("heading", { name: profile.name });
  window.location.hash = "#perfil/cafe";
  await waitFor(() => expect(screen.getByRole("heading", { name: "Café cercano" })).toBeInTheDocument());
});
