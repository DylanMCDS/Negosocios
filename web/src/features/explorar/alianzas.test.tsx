import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const leaflet = vi.hoisted(() => ({ lines: [] as unknown[], pins: [] as string[] }));
vi.mock("leaflet", () => {
  const chain: Record<string, unknown> = {};
  for (const name of ["setView", "addTo", "on", "remove", "fitBounds", "setIcon", "getElement"]) chain[name] = () => chain;
  const api = {
    map: () => chain, tileLayer: () => chain, marker: (_c: unknown, o: { title?: string }) => { leaflet.pins.push(o?.title ?? ""); return chain; }, divIcon: (o: unknown) => o, latLngBounds: () => chain,
    polyline: (pts: unknown) => { leaflet.lines.push(pts); return chain; },
  };
  return { default: api, ...api };
});
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import Explorar from "./index";

const profile = (over: Record<string, unknown>) => ({
  business_id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Tianguis de ejemplo", lat: 19.432, lng: -99.133,
  location_precision: "approximate", schedule: {}, accepts_codi: true, verified: false, verification_text: null,
  rating: null, rating_count: 0, distance_km: 0.12, open_now: true, temporary_current: false, temporary_expires_at: null, demo_data: true, ...over,
});
const network = [
  profile({}),
  profile({ business_id: "fonda", name: "Fonda Lupita", category: "Fonda", zone: "Centro", lat: 19.433, lng: -99.134, distance_km: 0.4 }),
  profile({ business_id: "barberia", name: "Barbería Centro", category: "Barbería", distance_km: 0.9 }),
];
const alliance = (status: string) => ({ id: "a1", status, partner_id: "fonda", partner_name: "Fonda Lupita", discount_pct: 10, demo: true, role: "giver" });

beforeEach(() => {
  leaflet.lines = [];
  leaflet.pins = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.startsWith("/api/alliances?business_id=rosa")) return json([alliance("active")]);
    if (url.startsWith("/api/alliances?business_id=fonda")) return json([{ ...alliance("active"), partner_id: "rosa", partner_name: "Tacos de Doña Rosa", role: "referrer" }]);
    if (url.startsWith("/api/alliances")) return json([]);
    if (url.includes("/reputation") || url.startsWith("/api/profile/")) return json({ detail: "no" }, 404);
    return json(network);
  }));
});
afterEach(() => vi.unstubAllGlobals());

const open = async (name: RegExp) => {
  render(<Explorar />);
  await userEvent.click(await screen.findByRole("button", { name }));
  return screen.findByRole("dialog");
};

describe("Red de alianzas", () => {
  it("alliances_button_only_when_business_has_alliances", async () => {
    const dialog = await open(/Tacos de Doña Rosa/);
    expect(await within(dialog).findByRole("button", { name: "Ver alianzas" })).toBeInTheDocument();
  });

  it("alliance_network_hidden_for_business_without_alliances", async () => {
    const dialog = await open(/Barbería Centro/);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/alliances?business_id=barberia", expect.anything()));
    expect(within(dialog).queryByRole("button", { name: "Ver alianzas" })).not.toBeInTheDocument();
  });

  it("alliance_network_lists_partners_with_discount", async () => {
    const dialog = await open(/Tacos de Doña Rosa/);
    await userEvent.click(await within(dialog).findByRole("button", { name: "Ver alianzas" }));
    const partner = await within(screen.getByRole("dialog")).findByRole("button", { name: /Fonda Lupita/ });
    expect(partner).toHaveTextContent("Fonda · Centro");
    expect(partner).toHaveTextContent("10 % de descuento");
    expect(screen.getAllByText("Datos de ejemplo").length).toBeGreaterThan(0);
    expect(screen.getByText("Aliados de este negocio")).toBeInTheDocument();
  });

  it("selecting_partner_selects_it_on_map", async () => {
    const dialog = await open(/Tacos de Doña Rosa/);
    await userEvent.click(await within(dialog).findByRole("button", { name: "Ver alianzas" }));
    await userEvent.click(await within(screen.getByRole("dialog")).findByRole("button", { name: /Fonda Lupita/ }));
    expect(await screen.findByRole("dialog", { name: /Vista previa de Fonda Lupita/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByRole("dialog", { name: /Vista previa de Tacos de Doña Rosa/ })).toBeInTheDocument();
  });

  it("partner_outside_the_active_filter_is_still_resolved_and_followable", async () => {
    vi.mocked(fetch).mockImplementation(async (url: unknown) => {
      const u = String(url);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
      if (u.startsWith("/api/alliances?business_id=rosa")) return json([alliance("active")]);
      if (u.startsWith("/api/alliances")) return json([]);
      if (u.includes("/reputation") || u.startsWith("/api/profile/")) return json({ detail: "no" }, 404);
      return json(new URL(u, "http://x").searchParams.get("category") ? [network[0]] : network);
    });
    render(<Explorar />);
    await userEvent.click(await screen.findByRole("button", { name: "Tacos" }));
    await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
    await userEvent.click(await within(await screen.findByRole("dialog")).findByRole("button", { name: "Ver alianzas" }));
    const partner = await within(screen.getByRole("dialog")).findByRole("button", { name: /Fonda Lupita/ });
    await waitFor(() => expect(partner).toBeEnabled());
    expect(partner).toHaveTextContent("Fonda · Centro");
    await userEvent.click(partner);
    expect(await screen.findByRole("dialog", { name: /Vista previa de Fonda Lupita/ })).toBeInTheDocument();
  });

  it("selected_business_and_allies_keep_their_pins_under_a_filter", async () => {
    vi.mocked(fetch).mockImplementation(async (url: unknown) => {
      const u = String(url);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
      if (u.startsWith("/api/alliances?business_id=rosa")) return json([alliance("active")]);
      if (u.startsWith("/api/alliances")) return json([]);
      if (u.includes("/reputation") || u.startsWith("/api/profile/")) return json({ detail: "no" }, 404);
      return json(new URL(u, "http://x").searchParams.get("category") ? [network[0]] : network);
    });
    render(<Explorar />);
    await userEvent.click(await screen.findByRole("button", { name: "Tacos" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Barbería Centro/ })).not.toBeInTheDocument());
    leaflet.pins = [];
    await userEvent.click(await screen.findByRole("button", { name: /Tacos de Doña Rosa/ }));
    await waitFor(() => expect(leaflet.pins).toContain("Fonda Lupita"));
    expect(leaflet.pins).not.toContain("Barbería Centro");
  });

  it("profile_link_opens_explorar_with_the_network_of_that_business", async () => {
    window.location.hash = "#explorar/rosa";
    render(<Explorar />);
    const dialog = await screen.findByRole("dialog", { name: /Vista previa de Tacos de Doña Rosa/ });
    expect(await within(dialog).findByText("Red de Tacos de Doña Rosa")).toBeInTheDocument();
    window.location.hash = "";
  });

  it("alliance_lines_are_drawn_to_partners_on_the_map", async () => {
    await open(/Tacos de Doña Rosa/);
    await waitFor(() => expect(leaflet.lines.length).toBeGreaterThan(0));
  });
});
