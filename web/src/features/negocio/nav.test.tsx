import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../../App";

beforeEach(() => {
  window.history.replaceState(null, "", "/#cobrar");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
});
afterEach(() => vi.unstubAllGlobals());

it("nav_has_no_pagar_and_starts_with_inicio", () => {
  render(<App />);
  for (const nav of screen.getAllByRole("navigation", { name: "Principal" })) {
    const labels = within(nav).getAllByRole("button").map((b) => b.textContent?.trim());
    expect(labels[0]).toBe("Inicio");
    expect(labels).not.toContain("Pagar");
    // Orden base conservado; las features nuevas (p. ej. Aliados) pueden aparecer sin romper la prueba.
    const base = ["Inicio", "Cobrar", "Cierre", "Negocio", "Voz", "Explorar"];
    expect(labels.filter((l) => base.includes(l as string))).toEqual(base);
  }
});

it("customer_link_opens_pagar_even_without_a_menu_entry", () => {
  window.history.replaceState(null, "", "/#pagar/1234567");
  render(<App />);
  expect(screen.getByText("Cargando cobro")).toBeInTheDocument();
});
