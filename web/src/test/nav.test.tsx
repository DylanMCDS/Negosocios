import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { House, MapPin, QrCode, Wallet } from "@phosphor-icons/react";
import { buildMenu, MenuBar, type FeatureNav } from "../lib/ui/NavBar";

const mod = (nav: FeatureNav) => ({ nav });
const modules = {
  "../features/landing/nav.ts": mod({ label: "Inicio", icon: House, order: 0, group: "inicio" }),
  "../features/cobrar/nav.ts": mod({ label: "Cobrar", icon: QrCode, order: 1, group: "negocio" }),
  "../features/pagar/nav.ts": mod({ label: "Pagar", icon: Wallet, order: 9, group: "clientes", hidden: true }),
};

describe("Menú por features", () => {
  it("feature_with_nav_file_appears_in_menu", () => {
    const before = buildMenu(modules);
    expect(before.clientes.map((e) => e.label)).toEqual([]);
    // A new feature only adds its own nav.ts: no edit to App.tsx.
    const after = buildMenu({
      ...modules,
      "../features/explorar/nav.ts": mod({ label: "Explorar", icon: MapPin, order: 1, group: "clientes" }),
    });
    expect(after.clientes.map((e) => [e.id, e.label])).toEqual([["explorar", "Explorar"]]);
    render(<MenuBar menu={after} active="cobrar" onSelect={() => undefined} />);
    for (const nav of screen.getAllByRole("navigation", { name: "Principal" })) {
      expect(within(nav).getByRole("button", { name: "Explorar" })).toBeInTheDocument();
    }
  });

  it("hidden_feature_is_not_in_menu", () => {
    const menu = buildMenu(modules);
    expect(menu.all.map((e) => e.id)).toContain("pagar"); // still routable
    render(<MenuBar menu={menu} active="pagar" onSelect={() => undefined} />);
    for (const nav of screen.getAllByRole("navigation", { name: "Principal" })) {
      expect(within(nav).queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    }
  });

  it("menu_groups_merchant_and_customer", () => {
    const onSelect = vi.fn();
    const menu = buildMenu({
      ...modules,
      "../features/explorar/nav.ts": mod({ label: "Explorar", icon: MapPin, order: 1, group: "clientes" }),
    });
    render(<MenuBar menu={menu} active="cobrar" onSelect={onSelect} />);
    const desktop = screen.getAllByRole("navigation", { name: "Principal" }).filter((n) => !n.className.includes("fixed"));
    for (const nav of desktop) {
      const buttons = within(nav).getAllByRole("button").map((b) => b.textContent?.trim());
      expect(buttons).toEqual(["Inicio", "Cobrar", "Explorar"]);
      expect(within(nav).getByRole("group", { name: "Mi negocio" })).toContainElement(within(nav).getByRole("button", { name: "Cobrar" }));
      expect(within(nav).getByRole("group", { name: "Clientes" })).toContainElement(within(nav).getByRole("button", { name: "Explorar" }));
    }
    fireEvent.click(screen.getAllByRole("button", { name: "Explorar" })[0]);
    expect(onSelect).toHaveBeenCalledWith("explorar");
  });
});

describe("Barra móvil", () => {
  const full = buildMenu({
    "../features/inicio/nav.ts": mod({ label: "Inicio", icon: House, order: 0, group: "inicio" }),
    "../features/cobrar/nav.ts": mod({ label: "Cobrar", icon: QrCode, order: 1, group: "negocio" }),
    "../features/cierre/nav.ts": mod({ label: "Cierre", icon: QrCode, order: 2, group: "negocio" }),
    "../features/aliados/nav.ts": mod({ label: "Aliados", icon: QrCode, order: 3, group: "negocio" }),
    "../features/negocio/nav.ts": mod({ label: "Negocio", icon: QrCode, order: 4, group: "negocio" }),
    "../features/voz/nav.ts": mod({ label: "Voz", icon: QrCode, order: 5, group: "negocio" }),
    "../features/puntos/nav.ts": mod({ label: "Puntos NFC/QR", icon: MapPin, order: 6, group: "negocio" }),
    "../features/explorar/nav.ts": mod({ label: "Explorar", icon: MapPin, order: 1, group: "clientes" }),
    "../features/pagar/nav.ts": mod({ label: "Pagar", icon: Wallet, order: 9, group: "clientes", hidden: true }),
  });
  const bar = () => screen.getAllByRole("navigation", { name: "Principal" }).find((n) => n.className.includes("fixed"))!;

  it("mobile_bar_has_five_entries_with_cobrar_in_centre", () => {
    render(<MenuBar menu={full} active="cobrar" onSelect={() => undefined} />);
    const labels = within(bar()).getAllByRole("button").map((b) => b.textContent?.trim());
    expect(labels).toEqual(["Inicio", "Cierre", "Cobrar", "Explorar", "Más"]);
  });

  it("mobile_more_opens_the_rest", () => {
    const onSelect = vi.fn();
    render(<MenuBar menu={full} active="cobrar" onSelect={onSelect} />);
    expect(within(bar()).queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(within(bar()).getByRole("button", { name: "Más" }));
    const sheet = within(bar()).getByRole("dialog", { name: "Más opciones" });
    expect(within(sheet).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Aliados", "Negocio", "Voz", "Puntos NFC/QR"]);
    fireEvent.click(within(sheet).getByRole("button", { name: "Voz" }));
    expect(onSelect).toHaveBeenCalledWith("voz");
  });
});
