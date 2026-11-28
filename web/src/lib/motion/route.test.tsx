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
  });

  it("pagar_loading_renders_skeleton_not_text_only", async () => {
    window.history.pushState({}, "", "/pagar/abc");
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    render(<App />);
    expect(await screen.findAllByTestId("skeleton")).not.toHaveLength(0);
    window.history.pushState({}, "", "/");
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

describe("restauración con datos lentos", () => {
  it("keeps_restoring_scroll_until_page_is_tall_enough", async () => {
    window.location.hash = "#cierre";
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("fetch", () => new Promise(() => {}));
    let tick: () => void = () => {};
    vi.stubGlobal("ResizeObserver", class { constructor(cb: () => void) { tick = cb; } observe() {} disconnect() {} });
    Object.defineProperty(window, "scrollY", { value: 600, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 300, configurable: true });
    render(<App />);
    await act(async () => { window.location.hash = "#cobrar"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.location.hash = "#cierre";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    scrollTo.mockClear();
    tick(); // data still short: restore again
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 600 }));
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 3000, configurable: true });
    tick(); // tall now: restores and stops
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});
