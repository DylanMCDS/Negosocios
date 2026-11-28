import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Cierre from "./index";

afterEach(() => vi.unstubAllGlobals());

describe("Cierre: movimiento", () => {
  it("cierre_loading_shows_skeleton_not_text", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    render(<Cierre />);
    expect(screen.getByRole("status", { name: /cargando/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByText(/cargando tu día/i)).toBeNull();
  });

  it("reduced_motion_removes_translate_in_these_screens", () => {
    // FadeIn moves with translateY(shift * --motion-move); reduced motion sets --motion-move to 0, so only the fade stays.
    const css = readFileSync(`${__dirname}/../../index.css`, "utf8");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  :root"));
    expect(reduced).toMatch(/--motion-move:\s*0/);
    expect(css).toMatch(/translateY\(calc\(var\(--motion-shift, 0px\) \* var\(--motion-move, 1\)\)\)/);
  });
});
