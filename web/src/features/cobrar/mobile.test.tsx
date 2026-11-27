import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Cobrar from "./index";
import Cierre from "../cierre/index";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});
afterEach(() => vi.unstubAllGlobals());

describe("Cobrar en celular (390 px)", () => {
  it("cobrar_amount_is_above_keypad", () => {
    render(<Cobrar />);
    const amount = screen.getByText("Importe");
    const keypad = screen.getByRole("group", { name: "Teclado numérico" });
    expect(amount.compareDocumentPosition(keypad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("cobrar_action_is_fixed_in_thumb_zone", () => {
    render(<Cobrar />);
    const bar = screen.getByRole("button", { name: /^Cobrar$/ }).closest("[data-thumb-bar]") as HTMLElement | null;
    expect(bar).not.toBeNull();
    expect(bar!.className).toMatch(/\bfixed\b/);
    expect(bar!.className).toMatch(/\bbottom-16\b/);
    expect(bar!.className).toMatch(/md:static/);
  });

  it("amount_inputs_use_decimal_keyboard", () => {
    const { unmount } = render(<Cierre />);
    const inputs = Array.from(document.querySelectorAll("input"));
    expect(inputs.length).toBeGreaterThan(0);
    for (const i of inputs) expect(i.getAttribute("inputmode")).toBe("decimal");
    unmount();
    render(<Cobrar />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    // phone numbers get the phone keyboard
    const phoneForm = document.querySelector("[data-thumb-bar]");
    expect(phoneForm).not.toBeNull();
  });

  it("no_content_hidden_behind_bottom_nav", () => {
    render(<Cobrar />);
    const page = document.querySelector("[data-cobrar-page]") as HTMLElement | null;
    expect(page).not.toBeNull();
    // fixed Cobrar bar (~5rem) + bottom nav (4rem) must not cover the last control
    expect(page!.className).toMatch(/\bpb-(2[4-9]|[3-9]\d)\b/);
    expect(page!.className).toMatch(/md:pb-0/);
  });
});
