import { act, render, screen, waitFor, within } from "@testing-library/react";
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


const publicPage = { ...all[0], cover: "maiz", reputation: { rating: 4.8, reviews_count: 9, endorsements: 3 }, promotions: [{ id: "promo-1", title: "Agua de la casa con Fonda Lupita", discount_pct: 10 }] };
function servePreview(fail = false) {
  const original = window.fetch;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.startsWith("/api/profile/")) {
      urls.push(url);
      return new Response(JSON.stringify(fail ? { detail: "offline" } : publicPage), { status: fail ? 503 : 200 });
    }
    return original(url);
  }));
}

it("selecting_business_shows_preview_card", async () => {
  servePreview();
  render(<Explorar />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
  expect(screen.queryByRole("dialog")).toBeInTheDocument();
  const card = screen.getByRole("dialog", { name: /vista previa/i });
  expect(card).toBeInTheDocument();
  expect(await within(card).findByText("4.8 de 5 · 9 reseñas")).toBeInTheDocument();
  expect(within(card).getByText("Agua de la casa con Fonda Lupita")).toBeInTheDocument();
  expect(within(card).getByText("Abierto ahora")).toBeInTheDocument();
  expect(within(card).getByText(/Tianguis de ejemplo/)).toBeInTheDocument();
  expect(urls).toContain("/api/profile/rosa");
});

it("preview_card_opens_profile_not_payment", async () => {
  servePreview(); render(<Explorar />);
  await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
  const card = screen.getByRole("dialog");
  expect(within(card).getByRole("link", { name: "Ver negocio" })).toHaveAttribute("href", "#perfil/rosa");
  expect(within(card).queryByRole("link", { name: /pagar|cobrar/i })).not.toBeInTheDocument();
});

it("preview_card_closes_with_escape_and_returns_focus", async () => {
  servePreview(); render(<Explorar />);
  const trigger = await screen.findByRole("button", { name: /Tacos de Doña Rosa/ });
  await userEvent.click(trigger);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("preview_card_falls_back_when_profile_fails", async () => {
  servePreview(true); render(<Explorar />);
  await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
  const card = screen.getByRole("dialog");
  expect(await within(card).findByText("No pudimos cargar el perfil")).toBeInTheDocument();
  expect(within(card).getByRole("heading", { name: "Tacos de Doña Rosa" })).toBeInTheDocument();
  expect(within(card).getByRole("link", { name: "Ver negocio" })).toHaveAttribute("href", "#perfil/rosa");
});

it("preview_closes_with_button_and_outside_pointer", async () => {
  servePreview(); render(<Explorar />);
  const trigger = await screen.findByRole("button", { name: /Tacos de Doña Rosa/ });
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole("button", { name: "Cerrar vista previa" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole("heading", { name: "Explorar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("preview_has_loading_state_until_public_profile_arrives", async () => {
  const original = window.fetch;
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn((url: string) => url.startsWith("/api/profile/") ? new Promise<Response>((resolve) => { finish = resolve; }) : original(url)));
  render(<Explorar />);
  await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status", { name: "Cargando perfil" })).toBeInTheDocument();
  await act(async () => { finish(new Response(JSON.stringify(publicPage), { status: 200 })); });
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");
  expect(screen.queryByRole("status", { name: "Cargando perfil" })).not.toBeInTheDocument();
});
