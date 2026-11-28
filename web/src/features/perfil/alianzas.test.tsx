import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Perfil from "./index";

const base = { business_id: "rosa", name: "Tacos de Doña Rosa", category: "Tacos", zone: "Centro", description: "", cover: "toldo", menu: [], whatsapp: null, schedule: {}, open_now: true, demo_data: true, promotions: [], reputation: { rating: null, reviews_count: 0, endorsements: 0 }, reviews: [] };
afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ""; });
const show = (allies: unknown[]) => {
  window.location.hash = "#perfil/rosa";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...base, allies }), { status: 200 })));
  render(<Perfil />);
};

it("profile_shows_alliance_network_with_discounts", async () => {
  show([{ business_id: "fonda", name: "Fonda Lupita", discount_pct: 10 }]);
  const link = await screen.findByRole("link", { name: "Ver alianzas" });
  expect(link).toHaveAttribute("href", "#explorar/rosa");
});

it("profile_hides_alliance_button_without_allies", async () => {
  show([]);
  await screen.findByRole("heading", { name: base.name });
  expect(screen.queryByRole("link", { name: "Ver alianzas" })).not.toBeInTheDocument();
});
