import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const leaflet = vi.hoisted(() => ({ fail: false }));
vi.mock("leaflet", () => {
  const chain: Record<string, unknown> = {};
  for (const name of ["setView", "addTo", "on", "remove", "fitBounds", "setIcon"]) chain[name] = () => chain;
  const api = { map: () => { if (leaflet.fail) throw new Error("map cannot start"); return chain; }, tileLayer: () => chain, marker: () => chain, divIcon: (o: unknown) => o, latLngBounds: () => chain };
  return { default: api, ...api };
});
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import Explorar from "./index";

const profile = (over: Record<string, unknown>) => ({
  business_id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis de ejemplo", lat: 19.432, lng: -99.133,
  location_precision: "approximate", schedule: { mon: { open: "08:00", close: "18:00" } }, accepts_codi: true, verified: true,
  verification_text: "Visita del equipo y comprobante de domicilio", rating: null, rating_count: 0, distance_km: 0.12, open_now: true,
  temporary_current: false, temporary_expires_at: null, demo_data: true, ...over,
});
const all = [
  profile({}),
  profile({ business_id: "fonda", name: "Fonda Lupita", category: "Fonda", distance_km: 0.4, verified: false, verification_text: null }),
  profile({ business_id: "barberia", name: "Barbería Centro", category: "Barbería", distance_km: 0.9, open_now: false }),
];

let urls: string[];
beforeEach(() => {
  leaflet.fail = false;
  urls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    urls.push(url);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.includes("/reputation")) {
      return url.includes("/rosa/") ? json({ rating: 4.5, reviews_count: 2, endorsements: 3 }) : json({ detail: "no" }, 404);
    }
    const params = new URL(url, "http://x").searchParams;
    const category = params.get("category");
    return json(category ? all.filter((p) => p.category === category) : all);
  }));
});
afterEach(() => vi.unstubAllGlobals());

const listNames = () => screen.getAllByRole("listitem").map((li) => within(li).queryByRole("button")?.textContent ?? "");

describe("Explorar", () => {
  it("shows_nearby_businesses_from_api", async () => {
    render(<Explorar />);
    expect(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fonda Lupita/ })).toBeInTheDocument();
    expect(urls[0]).toMatch(/^\/api\/network\?lat=19\.432&lng=-99\.133/);
    const names = screen.getAllByRole("button", { name: /Tacos de Doña Rosa|Fonda Lupita|Barbería Centro/ }).map((b) => b.textContent);
    expect(names[0]).toContain("Tacos de Doña Rosa");
    expect(names[2]).toContain("Barbería Centro"); // ordered by distance
    expect(screen.getByText(/120 m/)).toBeInTheDocument();
  });

  it("filters_by_category", async () => {
    render(<Explorar />);
    await screen.findByRole("button", { name: /Fonda Lupita/ });
    await userEvent.click(screen.getByRole("button", { name: "Tacos" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Fonda Lupita/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Tacos de Doña Rosa/ })).toBeInTheDocument();
    expect(urls.some((u) => u.includes("category=Tacos"))).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Tacos" })); // toggles off
    expect(await screen.findByRole("button", { name: /Fonda Lupita/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Abierto ahora" }));
    await waitFor(() => expect(urls.some((u) => u.includes("open_now=true"))).toBe(true));
  });

  it("shows_list_when_map_unavailable", async () => {
    leaflet.fail = true;
    render(<Explorar />);
    expect(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ })).toBeInTheDocument();
    expect(await screen.findByText(/El mapa no está disponible/)).toBeInTheDocument();
    expect(listNames().length).toBeGreaterThan(0);
  });

  it("profile_shows_verification_stars_and_endorsements_separately", async () => {
    render(<Explorar />);
    await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
    expect(await screen.findByText(/Verificado: Visita del equipo/)).toBeInTheDocument();
    expect(await screen.findByText("4.5 de 5 · 2 reseñas")).toBeInTheDocument();
    expect(screen.getByText("Recomendado por 3 aliados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver negocio" })).toHaveAttribute("href", "#perfil/rosa");
    expect(screen.getByText(/Lunes/)).toBeInTheDocument(); // horario
  });
});


it("explorar_opens_profile_not_payment", async () => {
  render(<Explorar />);
  await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
  expect(screen.getByRole("link", { name: "Ver negocio" })).toHaveAttribute("href", "#perfil/rosa");
  expect(screen.queryByRole("link", { name: "Paga aquí con CoDi" })).not.toBeInTheDocument();
});
