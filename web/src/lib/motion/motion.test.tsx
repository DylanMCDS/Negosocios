import { readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION, applyMotionTokens, changeRoute } from ".";
import { Skeleton, SkeletonList } from "../ui";
import Pagar from "../ui/locked/Pagar";

const reduced = (on: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));

afterEach(() => {
  vi.unstubAllGlobals();
  delete (document as unknown as Record<string, unknown>).startViewTransition;
});

describe("movimiento", () => {
  it("route_change_uses_transition_and_respects_reduced_motion", () => {
    const start = vi.fn((cb: () => void) => cb());
    (document as unknown as Record<string, unknown>).startViewTransition = start;
    const update = vi.fn();
    reduced(false);
    changeRoute(update);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    reduced(true);
    changeRoute(update);
    expect(start).toHaveBeenCalledTimes(1); // sin movimiento: cambio inmediato
    expect(update).toHaveBeenCalledTimes(2);
    // sin View Transitions: el cambio igual ocurre (el fundido CSS es el respaldo)
    delete (document as unknown as Record<string, unknown>).startViewTransition;
    reduced(false);
    changeRoute(update);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it("loading_states_render_skeleton_not_text", () => {
    render(<SkeletonList rows={3} label="Cargando" />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
    expect(screen.getByRole("status", { name: "Cargando" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Cargando…")).toBeNull();
    render(<Skeleton className="h-20" />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
  });

  it("motion_tokens_are_single_source", () => {
    applyMotionTokens();
    const root = document.documentElement.style;
    expect(root.getPropertyValue("--motion-route")).toBe(`${MOTION.duration.route}ms`);
    expect(MOTION.duration.route).toBeGreaterThanOrEqual(150);
    expect(MOTION.duration.route).toBeLessThanOrEqual(220);
    expect(root.getPropertyValue("--motion-ease")).toBe(MOTION.ease.out);
    const css = readFileSync("src/index.css", "utf8").replace(/0\.01ms/g, "");
    expect(css).not.toMatch(/\d(ms|s)\b/); // el CSS sólo lee var(--motion-*)
    expect(css).not.toMatch(/cubic-bezier/);
  });

  it("pagado_screen_fades_in", () => {
    render(<Pagar />);
    expect(screen.queryByTestId("fade-in")).toBeNull();
    fireEvent.click(screen.getByText("Pagar 100 MXN"));
    const done = screen.getByTestId("fade-in");
    expect(done).toHaveTextContent("Pagado 100 MXN");
    expect(done).toHaveClass("motion-fade-in");
  });
});
