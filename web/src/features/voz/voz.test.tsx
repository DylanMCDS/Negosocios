import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Voz from "./index";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const parsed = { amount_cents: 35000, category: "insumos", description: "tortillas", ambiguous: false };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const calls = (path: string) => fetchMock.mock.calls.filter(([url]) => url === path);

async function say(text: string) {
  fireEvent.change(screen.getByLabelText(/lo que dijiste/i), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /interpretar/i }));
  });
}

describe("Voz", () => {
  it("does_not_save_without_confirmation", async () => {
    fetchMock.mockImplementation((url: string) => json(url === "/api/expenses/parse" ? parsed : { id: "e1" }, 200));
    render(<Voz />);
    await say("gasté 350 en tortillas");
    expect(calls("/api/expenses/parse")).toHaveLength(1);
    expect(calls("/api/expenses")).toHaveLength(0);
    expect(screen.getByLabelText(/importe/i)).toHaveValue("350.00");
    expect(screen.getByLabelText(/categoría/i)).toHaveValue("insumos");
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("tortillas");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirmar y guardar/i }));
    });
    const saved = calls("/api/expenses");
    expect(saved).toHaveLength(1);
    const body = JSON.parse(saved[0][1].body);
    expect(body).toMatchObject({ amount_cents: 35000, category: "insumos", description: "tortillas", source: "voice" });
    expect(await screen.findByText(/gasto guardado/i)).toBeInTheDocument();
  });

  it("lets_the_user_edit_fields_before_saving", async () => {
    fetchMock.mockImplementation((url: string) => json(url === "/api/expenses/parse" ? parsed : { id: "e1" }));
    render(<Voz />);
    await say("gasté 350 en tortillas");
    fireEvent.change(screen.getByLabelText(/importe/i), { target: { value: "360" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirmar y guardar/i }));
    });
    expect(JSON.parse(calls("/api/expenses")[0][1].body).amount_cents).toBe(36000);
  });

  it("asks_to_fix_ambiguous_amount", async () => {
    fetchMock.mockImplementation(() => json({ amount_cents: null, category: "otros", description: "tortillas", ambiguous: true }));
    render(<Voz />);
    await say("compré tortillas");
    expect(screen.getByText(/corrige el importe/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar y guardar/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/importe/i), { target: { value: "50" } });
    expect(screen.getByRole("button", { name: /confirmar y guardar/i })).toBeEnabled();
    expect(calls("/api/expenses")).toHaveLength(0);
  });

  it("offers_manual_capture_when_browser_has_no_speech", () => {
    render(<Voz />);
    expect(screen.queryByRole("button", { name: /dictar/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/lo que dijiste/i)).toBeInTheDocument();
    expect(screen.getByText(/tu navegador no entiende voz/i)).toBeInTheDocument();
  });
});
