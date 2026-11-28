import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

afterEach(() => {
  vi.unstubAllGlobals();
  delete (document as unknown as Record<string, unknown>).startViewTransition;
});

describe("navegación con movimiento", () => {
  it("hashchange_changes_screen_inside_view_transition_and_keeps_menu", async () => {
    window.location.hash = "#cobrar";
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("fetch", () => new Promise(() => {})); // data never arrives: the loading state stays
    const start = vi.fn((cb: () => void) => cb());
    (document as unknown as Record<string, unknown>).startViewTransition = start;
    const { container } = render(<App />);
    const navs = container.querySelectorAll("nav");
    const first = container.querySelector(".motion-route");
    await act(async () => {
      window.location.hash = "#cierre";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(start).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".motion-route")).not.toBe(first); // new screen mounted
    expect(container.querySelectorAll("nav")[0]).toBe(navs[0]); // the menu is not re-mounted
    expect(await screen.findAllByTestId("skeleton")).not.toHaveLength(0); // cierre loads with skeletons, not text
    expect(screen.queryByText("Cargando tu día…")).toBeNull();
  });

  it("going_back_restores_scroll_position", async () => {
    window.location.hash = "#cierre";
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { value: 600, configurable: true });
    render(<App />);
    await act(async () => {
      window.location.hash = "#cobrar";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 0 }));
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.location.hash = "#cierre";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 600 }));
  });
});
