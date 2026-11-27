import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Landing from "./index";

describe("Landing", () => {
  it("shows_one_line_and_cta", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1, name: /cobra con codi/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /probar la demo/i })).toBeTruthy();
    // Un dato con fuente.
    const source = screen.getByRole("link", { name: /codi\.org\.mx/i });
    expect(source.getAttribute("href")).toContain("codi.org.mx");
    // Tres pasos y la aclaración de que no es un producto oficial.
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/no es un producto oficial/i)).toBeTruthy();
    expect(screen.getByText(/usa codi y la api de pey/i)).toBeTruthy();
  });

  it("cta_links_to_cobrar", () => {
    render(<Landing />);
    expect(screen.getByRole("link", { name: /probar la demo/i }).getAttribute("href")).toBe("#cobrar");
  });
  it("shows_value_line_and_demo_cta", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 2, name: /para el comerciante/i })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: /para el cliente/i })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /probar la demo/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows_real_app_screens", () => {
    render(<Landing />);
    const srcs = screen.getAllByRole("img").map((i) => i.getAttribute("src") ?? "");
    for (const name of ["cobrar", "pagado", "cierre", "explorar"]) {
      expect(srcs.some((s) => s.startsWith("/landing/") && s.endsWith(".webp") && s.includes(name))).toBe(true);
    }
  });

  it("images_have_alt_text", () => {
    const { container } = render(<Landing />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs.length).toBeGreaterThanOrEqual(4);
    for (const img of imgs) expect((img.getAttribute("alt") ?? "").trim().length).toBeGreaterThan(8);
  });
});
