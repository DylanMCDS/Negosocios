import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscountFields, emptyValues, PromoSimulator } from "./index";

const simulation = {
  currency: "MXN", ok: true, max_discount_pct: 20, message: null,
  formula: "100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)", budget_cents: 30000, max_uses: 37,
};

function mockSimulate() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(simulation), { status: 200 })));
}

afterEach(() => vi.unstubAllGlobals());

const sentence = (text: string) => (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === text;

describe("discount fields", () => {
  it("fields_show_plain_language_examples", () => {
    mockSimulate();
    render(<PromoSimulator />);
    expect(screen.getByText("¿En cuánto vendes el producto? Ej. $40 la orden")).toBeInTheDocument();
    expect(screen.getByText("¿Cuánto te cuesta hacerlo?")).toBeInTheDocument();
    expect(screen.getByText("¿Cuánto quieres ganar como mínimo por venta?")).toBeInTheDocument();
    expect(screen.getByText("¿Cuánto darías en descuentos en total?")).toBeInTheDocument();
    // The merchant question is the field's description; the short name stays its label.
    expect(screen.getByLabelText("Precio")).toHaveAccessibleDescription("¿En cuánto vendes el producto? Ej. $40 la orden");
  });

  it("every_field_shows_a_concrete_example", () => {
    mockSimulate();
    render(<PromoSimulator />);
    for (const [label, example] of [
      ["Precio", "Ej. $40 la orden"],
      ["Costo", "Ej. $22 entre ingredientes y empaque"],
      ["Ganancia mínima", "Ej. $10 por orden"],
      ["Presupuesto", "Ej. $300 para toda la promoción"],
    ] as const) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(expect.stringContaining(example));
    }
  });

  it("uses_field_shows_a_concrete_example", () => {
    render(<DiscountFields values={emptyValues} keys={["uses"]} onChange={() => undefined} />);
    expect(screen.getByLabelText("Usos")).toHaveAccessibleDescription(expect.stringContaining("Ej. 20 veces"));
  });

  it("result_sentence_updates_while_typing", async () => {
    mockSimulate();
    render(<PromoSimulator />);
    await userEvent.type(screen.getByLabelText("Precio"), "$40");
    await userEvent.type(screen.getByLabelText("Costo"), "22");
    await userEvent.type(screen.getByLabelText("Ganancia mínima"), "10");
    await userEvent.type(screen.getByLabelText("Presupuesto"), "300");
    expect(
      await screen.findByText(sentence("Puedes dar hasta $8 por venta y sigues ganando $10; con $300 te alcanza para 37 ventas")),
    ).toBeInTheDocument();
    // Change one number: the sentence changes without pressing anything.
    await userEvent.clear(screen.getByLabelText("Precio"));
    await userEvent.type(screen.getByLabelText("Precio"), "30");
    expect(await screen.findByText(sentence("Con estos números no puedes dar descuento sin perder"))).toBeInTheDocument();
  });
});
