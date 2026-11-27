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
});
