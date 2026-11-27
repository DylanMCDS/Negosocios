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

  it("parses_amount_and_item_from_spanish_phrase", async () => {
    fetchMock.mockImplementation(() => json(parsed));
    render(<Voz />);
    await say("gasté 350 en tortillas");
    expect(JSON.parse(calls("/api/expenses/parse")[0][1].body)).toEqual({ text: "gasté 350 en tortillas" });
    expect(screen.getByLabelText(/importe/i)).toHaveValue("350.00");
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("tortillas");
  });

  it("parses_amount_written_with_pesos_word", async () => {
    fetchMock.mockImplementation(() => json({ ...parsed, amount_cents: 20000, category: "servicios", description: "gas" }));
    render(<Voz />);
    await say("gasté doscientos pesos en gas");
    expect(screen.getByLabelText(/importe/i)).toHaveValue("200.00");
    expect(screen.getByLabelText(/categoría/i)).toHaveValue("servicios");
  });

  it("flags_ambiguous_amount", async () => {
    fetchMock.mockImplementation(() => json({ amount_cents: null, category: "otros", description: "", ambiguous: true }));
    render(<Voz />);
    await say("gasté 350 y 200");
    expect(screen.getByText(/corrige el importe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/importe/i)).toHaveValue("");
  });
});


class FakeRecognition {
  static latest: FakeRecognition;
  lang = "";
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  stopped = false;
  aborted = false;
  constructor() { FakeRecognition.latest = this; }
  start() {}
  stop() { this.stopped = true; this.onend?.(); }
  abort() { this.aborted = true; this.onend?.(); }
}

describe("active business and microphone recovery", () => {
  afterEach(() => { localStorage.clear(); vi.useRealTimers(); });

  it("expense_is_saved_to_active_business", async () => {
    localStorage.setItem("negosocios.business_id", "puesto-activo");
    const expenses: Record<string, unknown>[] = [];
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (url === "/api/expenses/parse") return json(parsed);
      const expense = JSON.parse(String(init.body));
      expenses.push(expense);
      return json({ id: "active-expense", ...expense });
    });
    render(<Voz />);
    await say("gasté 350 en tortillas");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /confirmar y guardar/i })); });
    expect(expenses).toEqual([expect.objectContaining({ business_id: "puesto-activo", amount_cents: 35000 })]);
    expect(screen.getByRole("link", { name: /ver en cierre/i })).toHaveAttribute("href", "#cierre");
  });

  it("listening_can_be_stopped_and_cancelled", () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    expect(screen.getByText("Escuchando…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(FakeRecognition.latest.stopped).toBe(true);
    expect(screen.queryByText("Escuchando…")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    const cancelled = FakeRecognition.latest;
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cancelled.aborted).toBe(true);
    act(() => { cancelled.onresult?.({ results: [[{ transcript: "resultado tardío" }]] }); });
    expect(screen.getByLabelText(/lo que dijiste/i)).toHaveValue("");
    expect(calls("/api/expenses")).toHaveLength(0);
  });

  it("listening_times_out_to_text_input", () => {
    vi.useFakeTimers();
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    act(() => { vi.advanceTimersByTime(8000); });
    expect(FakeRecognition.latest.aborted).toBe(true);
    expect(screen.getByText("No te escuché. Intenta de nuevo o escríbelo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("gasté 350 en tortillas")).toHaveFocus();
    expect(screen.queryByText("Escuchando…")).not.toBeInTheDocument();
  });

  it("denied_microphone_falls_back_to_text", () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    act(() => { FakeRecognition.latest.onerror?.({ error: "not-allowed" }); });
    expect(screen.getByText(/permiso del micrófono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lo que dijiste/i)).toHaveFocus();
    expect(screen.getByRole("button", { name: /interpretar/i })).toBeDisabled();
  });
});


describe("speech lifecycle", () => {
  it("speech_result_can_be_reviewed_before_confirmation", async () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    fetchMock.mockImplementation(() => json(parsed));
    render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    act(() => { FakeRecognition.latest.onresult?.({ results: [[{ transcript: "gasté 350 en tortillas" }]] }); });
    expect(screen.getByLabelText(/lo que dijiste/i)).toHaveValue("gasté 350 en tortillas");
    expect(screen.queryByText("Escuchando…")).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /interpretar/i })); });
    expect(screen.getByText("Esto entendí")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText(/importe/i)).not.toBeInTheDocument();
    expect(calls("/api/expenses")).toHaveLength(0);
  });

  it("start_failure_and_early_end_recover_to_text", () => {
    class ThrowingRecognition extends FakeRecognition { start() { throw new Error("unavailable"); } }
    vi.stubGlobal("SpeechRecognition", ThrowingRecognition);
    const view = render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    expect(screen.getByText(/no se pudo iniciar el micrófono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lo que dijiste/i)).toHaveFocus();
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    view.rerender(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    act(() => { FakeRecognition.latest.onend?.(); });
    expect(screen.getByText("No te escuché. Intenta de nuevo o escríbelo")).toBeInTheDocument();
  });

  it("unmount_aborts_microphone_and_detaches_callbacks", () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    const view = render(<Voz />);
    fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
    view.unmount();
    expect(FakeRecognition.latest.aborted).toBe(true);
    expect(FakeRecognition.latest.onresult).toBeNull();
  });
});


it("waits_for_final_transcript_after_asynchronous_stop", () => {
  class AsyncRecognition extends FakeRecognition { stop() { this.stopped = true; } }
  vi.stubGlobal("SpeechRecognition", AsyncRecognition);
  render(<Voz />);
  fireEvent.change(screen.getByLabelText(/lo que dijiste/i), { target: { value: "texto previo" } });
  fireEvent.click(screen.getByRole("button", { name: /toca para hablar/i }));
  fireEvent.click(screen.getByRole("button", { name: "Detener" }));
  expect(screen.getByRole("button", { name: /interpretar/i })).toBeDisabled();
  act(() => { FakeRecognition.latest.onresult?.({ results: [[{ transcript: "gasté 350 en tortillas" }]] }); });
  expect(screen.getByLabelText(/lo que dijiste/i)).toHaveValue("gasté 350 en tortillas");
  expect(screen.getByRole("button", { name: /interpretar/i })).toBeEnabled();
});
