import { useCallback, useEffect, useId, useState } from "react";
import { api } from "../api";
import type { CampaignSimulation } from "../types";
import { Button, SectionHeader, Surface } from "../ui";
import { mxn } from "../ui/locked/demoDay";

/* One shared piece for "how much discount can I give without losing": Aliados → Proponer and Cierre → Simulador.
   Fields speak merchant language with an example; the result is one sentence that updates while typing. */

export type DiscountKey = "price" | "cost" | "margin" | "budget" | "uses";
export type DiscountValues = Record<DiscountKey, string>;
export const emptyValues: DiscountValues = { price: "", cost: "", margin: "", budget: "", uses: "" };

// "$40", "40", "40,5" and " 40 " all mean the same amount.
const clean = (pesos: string) => pesos.replace(/[$\s]/g, "").replace(",", ".");
export const toCents = (pesos: string) => Math.round(Number(clean(pesos)) * 100);
export const validAmount = (pesos: string) => clean(pesos) !== "" && Number.isFinite(toCents(pesos)) && toCents(pesos) >= 0;

// The short name stays the label (what the field is called); the question is its description.
const FIELDS: Record<DiscountKey, { label: string; question: string }> = {
  price: { label: "Precio", question: "¿En cuánto vendes el producto? Ej. $40 la orden" },
  cost: { label: "Costo", question: "¿Cuánto te cuesta hacerlo?" },
  margin: { label: "Ganancia mínima", question: "¿Cuánto quieres ganar como mínimo por venta?" },
  budget: { label: "Presupuesto", question: "¿Cuánto darías en descuentos en total?" },
  uses: { label: "Usos", question: "¿Cuántas veces se puede usar?" },
};

const input = "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] font-display";

const fieldOk = (key: DiscountKey, v: DiscountValues) =>
  key === "uses" ? Number(v.uses) > 0 : key === "price" ? validAmount(v.price) && toCents(v.price) > 0 : validAmount(v[key]);

/* Every field is always in the DOM. On a phone only the current step shows (one question at a time);
   from md up they all show. */
export function DiscountFields({
  values, onChange, keys,
}: { values: DiscountValues; onChange: (key: DiscountKey, value: string) => void; keys: DiscountKey[] }) {
  const base = useId();
  const [step, setStep] = useState(0);
  const last = keys.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((key, i) => {
          const { label, question } = FIELDS[key];
          return (
            <div key={key} className={`${i === step ? "flex" : "hidden"} flex-col gap-1 md:flex`}>
              <label htmlFor={`${base}-${key}`} className="font-display text-[length:var(--text-s)] text-ink-2">
                {label}
              </label>
              <p id={`${base}-${key}-q`} className="text-[length:var(--text-body)]">{question}</p>
              <input
                id={`${base}-${key}`}
                className={input}
                inputMode={key === "uses" ? "numeric" : "decimal"}
                value={values[key]}
                aria-describedby={`${base}-${key}-q`}
                onChange={(e) => onChange(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 md:hidden">
        <Button type="button" variant="secondary" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Atrás
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={step === last || !fieldOk(keys[step], values)} onClick={() => setStep(step + 1)}>
          Siguiente
        </Button>
        <span className="self-center text-[length:var(--text-s)] text-ink-2">{`Paso ${step + 1} de ${keys.length}`}</span>
      </div>
    </div>
  );
}

export function promoNumbers(v: DiscountValues) {
  const ready = validAmount(v.price) && toCents(v.price) > 0 && validAmount(v.cost) && validAmount(v.margin);
  if (!ready) return null;
  const keeps = toCents(v.margin);
  const perSale = toCents(v.price) - toCents(v.cost) - keeps; // the most that can come off one sale
  const budget = validAmount(v.budget) ? toCents(v.budget) : 0;
  return { perSale, keeps, budget, sales: perSale > 0 && budget > 0 ? Math.floor(budget / perSale) : null };
}

/* The server owns the percentage (finance.max_discount); the pesos sentence is the same integer cents arithmetic. */
export function usePromoSimulation(values: DiscountValues) {
  const [sim, setSim] = useState<CampaignSimulation | null>(null);
  const [error, setError] = useState(false);
  const ready = promoNumbers(values) !== null;
  const { price, cost, margin, budget } = values;

  const run = useCallback(
    (alive: () => boolean) => {
      setError(false);
      api<CampaignSimulation>("/campaigns/simulate", {
        method: "POST",
        body: JSON.stringify({
          price_cents: toCents(price), variable_cost_cents: toCents(cost), min_contribution_cents: toCents(margin),
          budget_cents: validAmount(budget) ? toCents(budget) : 0, currency: "MXN",
        }),
      }).then(
        (r) => alive() && setSim(r),
        () => { if (alive()) { setSim(null); setError(true); } },
      );
    },
    [price, cost, margin, budget],
  );

  useEffect(() => {
    if (!ready) return;
    let on = true;
    const timer = setTimeout(() => run(() => on), 200);
    return () => {
      on = false;
      clearTimeout(timer);
    };
  }, [ready, run]);

  return { sim: ready ? sim : null, error: ready && error, refresh: () => run(() => true) };
}

export function PromoResult({ values, sim, error }: { values: DiscountValues; sim: CampaignSimulation | null; error: boolean }) {
  const n = promoNumbers(values);
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {!n && <p className="text-ink-2">Escribe tus números y aquí verás cuánto descuento puedes dar.</p>}
      {n && n.perSale <= 0 && (
        <p className="font-display text-[length:var(--text-l)]">Con estos números no puedes dar descuento sin perder</p>
      )}
      {n && n.perSale > 0 && (
        <p className="font-display text-[length:var(--text-l)]">
          {"Puedes dar hasta "}
          <strong className="text-money">{mxn(n.perSale)}</strong>
          {` por venta y sigues ganando ${mxn(n.keeps)}`}
          {n.budget > 0 && `; con ${mxn(n.budget)} te alcanza para ${n.sales} ${n.sales === 1 ? "venta" : "ventas"}`}
        </p>
      )}
      {error && <p role="alert">No pudimos calcular. Intenta de nuevo.</p>}
      {n && sim?.ok && sim.max_discount_pct !== null && (
        <>
          <p>{`Puedes dar hasta ${sim.max_discount_pct.toLocaleString("es-MX")} % de descuento`}</p>
          <p className="text-ink-2">
            {`Cuenta: ${mxn(toCents(values.price))} − ${mxn(toCents(values.cost) + toCents(values.margin))} (costo + ganancia) = ${mxn(n.perSale)}, o sea ${sim.max_discount_pct.toLocaleString("es-MX")} % del precio.`}
          </p>
          {sim.max_uses !== null && n.budget > 0 && <p>{`Tu presupuesto de ${mxn(sim.budget_cents)} alcanza para ${sim.max_uses} usos.`}</p>}
        </>
      )}
      {n && sim && !sim.ok && <p>{sim.message ?? "No hay descuento posible."}</p>}
    </div>
  );
}

/* Cierre → Simulador de promoción. */
export function PromoSimulator() {
  const [values, setValues] = useState<DiscountValues>(emptyValues);
  const { sim, error, refresh } = usePromoSimulation(values);
  const ready = (["price", "cost", "margin", "budget"] as const).every((k) => fieldOk(k, values));
  return (
    <Surface className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SectionHeader title="Simulador de promoción" size="sm" />
        <p className="pt-2 font-display text-[length:var(--text-l)]">¿Cuánto descuento puedo dar sin perder?</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); refresh(); }}>
        <DiscountFields values={values} keys={["price", "cost", "margin", "budget"]} onChange={(k, v) => setValues((o) => ({ ...o, [k]: v }))} />
        <Button type="submit" disabled={!ready}>Calcular</Button>
      </form>
      <PromoResult values={values} sim={sim} error={error} />
    </Surface>
  );
}
