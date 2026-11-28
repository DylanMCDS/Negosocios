import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Closing } from "../../lib/types";
import Cierre from "./index";

const empty: Closing = {
  currency: "MXN", confirmed_sales_cents: 20000, expenses_cents: 0, estimated_profit_cents: 20000,
  pending: [], pending_cents: 0, missing: ["expenses"],
};
const filled: Closing = { ...empty, expenses_cents: 5000, estimated_profit_cents: 15000, missing: [] };

function mockApi() {
  const calls: Array<{ url: string; body?: string }> = [];
  let saved = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body as string | undefined });
    if (url === "/api/expenses") { saved = true; return new Response(JSON.stringify({ id: "e1" }), { status: 201 }); }
    return new Response(JSON.stringify(saved ? filled : empty), { status: 200 });
  }));
  return calls;
}

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("Gastos desde Cierre", () => {
  it("closing_notice_links_to_add_expense_and_voice", async () => {
    mockApi();
    render(<Cierre />);
    expect(await screen.findByRole("button", { name: "Agregar gasto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dictar gasto" })).toHaveAttribute("href", "#voz");
  });

  it("manual_expense_form_posts_manual_source_for_active_business", async () => {
    localStorage.setItem("negosocios.business_id", "b-123");
    const calls = mockApi();
    render(<Cierre />);
    await userEvent.click(await screen.findByRole("button", { name: "Agregar gasto" }));
    await userEvent.type(screen.getByLabelText("Importe"), "50.00");
    await userEvent.selectOptions(screen.getByLabelText("Categoría"), "insumos");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/expenses")).toBe(true));
    const sent = JSON.parse(calls.find((c) => c.url === "/api/expenses")!.body!);
    expect(sent).toMatchObject({ business_id: "b-123", amount_cents: 5000, category: "insumos", source: "manual" });
  });

  it("saved_expense_updates_closing_without_reload", async () => {
    mockApi();
    render(<Cierre />);
    await userEvent.click(await screen.findByRole("button", { name: "Agregar gasto" }));
    await userEvent.type(screen.getByLabelText("Importe"), "50");
    await userEvent.selectOptions(screen.getByLabelText("Categoría"), "renta");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(screen.queryByText(/Faltan tus gastos/)).not.toBeInTheDocument());
    expect(screen.getByText(/\$150/)).toBeInTheDocument();
  });

  it("expense_form_rejects_zero_amount", async () => {
    const calls = mockApi();
    render(<Cierre />);
    await userEvent.click(await screen.findByRole("button", { name: "Agregar gasto" }));
    await userEvent.type(screen.getByLabelText("Importe"), "0");
    await userEvent.selectOptions(screen.getByLabelText("Categoría"), "luz y agua");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    expect(await screen.findByText(/mayor a 0/)).toBeInTheDocument();
    expect(calls.some((c) => c.url === "/api/expenses")).toBe(false);
  });
});
