import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle, Clock, Warning } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { CampaignSimulation, Closing } from "../../lib/types";
import { Button, Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Stat, Surface } from "../../lib/ui";
import { mxn } from "../../lib/ui/locked/demoDay";
import { getBusinessId } from "../negocio/businessId";

const DEMO_BUSINESS_ID = "rosa"; // negocio de la jornada de ejemplo cuando aún no hay alta en este navegador

const MISSING_TEXT: Record<string, string> = {
  sales: "Faltan tus ventas cobradas",
  expenses: "Faltan tus gastos",
};

const toCents = (pesos: string) => Math.round(Number(pesos.replace(",", ".")) * 100);
const field =
  "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] font-display";

function Simulador() {
  const [values, setValues] = useState({ price: "", cost: "", margin: "", budget: "" });
  const [result, setResult] = useState<CampaignSimulation | null>(null);
  const [error, setError] = useState(false);
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const valid = Object.values(values).every((v) => v.trim() !== "" && Number.isFinite(toCents(v))) && toCents(values.price) > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    try {
      setResult(
        await api<CampaignSimulation>("/campaigns/simulate", {
          method: "POST",
          body: JSON.stringify({
            price_cents: toCents(values.price),
            variable_cost_cents: toCents(values.cost),
            min_contribution_cents: toCents(values.margin),
            budget_cents: toCents(values.budget),
            currency: "MXN",
          }),
        }),
      );
    } catch {
      setResult(null);
      setError(true);
    }
  }

  const labeled = (id: keyof typeof values, label: string) => (
    <label className="flex flex-col gap-1 text-[length:var(--text-s)] text-ink-2">
      {label}
      <input className={field} inputMode="decimal" value={values[id]} onChange={set(id)} />
    </label>
  );

  return (
    <Surface className="flex flex-col gap-6">
      <SectionHeader title="Simulador de promoción" size="sm" />
      <form className="grid grid-cols-2 gap-4" onSubmit={submit}>
        {labeled("price", "Precio")}
        {labeled("cost", "Costo")}
        {labeled("margin", "Ganancia mínima")}
        {labeled("budget", "Presupuesto")}
        <Button type="submit" className="col-span-2" disabled={!valid}>Calcular</Button>
      </form>
      {error && <p role="alert">No pudimos calcular. Intenta de nuevo.</p>}
      {result && (
        <div className="flex flex-col gap-2" aria-live="polite">
          {result.ok && result.max_discount_pct !== null ? (
            <>
              <p className="font-display text-[length:var(--text-l)]">
                {`Puedes dar hasta ${result.max_discount_pct.toLocaleString("es-MX")} % de descuento`}
              </p>
              <p className="text-ink-2">
                {`Cuenta: ${mxn(toCents(values.price))} − ${mxn(toCents(values.cost) + toCents(values.margin))} (costo + ganancia) = ${mxn(toCents(values.price) - toCents(values.cost) - toCents(values.margin))}, o sea ${result.max_discount_pct.toLocaleString("es-MX")} % del precio.`}
              </p>
              {result.max_uses !== null && (
                <p>{`Tu presupuesto de ${mxn(result.budget_cents)} alcanza para ${result.max_uses} usos.`}</p>
              )}
            </>
          ) : (
            <p className="font-display text-[length:var(--text-body)]">{result.message ?? "No hay descuento posible."}</p>
          )}
        </div>
      )}
    </Surface>
  );
}

export default function Cierre() {
  const [closing, setClosing] = useState<Closing | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<Closing>(`/closing/today?business_id=${encodeURIComponent(getBusinessId() ?? DEMO_BUSINESS_ID)}`).then(setClosing, () => setFailed(true));
  }, []);

  const demo = closing?.pending.some((o) => o.demo_data) ?? false;
  return (
    <>
      <PageHeader title="Cierre del día" lead="Cobros con CoDi y gastos de hoy" action={demo ? <DataBadge /> : undefined} />
      <PageLayout aside={<Simulador />}>
        {failed && <p role="alert">No pudimos cargar tu cierre. Intenta de nuevo.</p>}
        {!closing && !failed && <p className="text-ink-2">Cargando tu día…</p>}
        {closing && (
          <>
            <Stat
              label="Utilidad estimada"
              value={mxn(closing.estimated_profit_cents)}
              unit="MXN"
              hero
              note="Ventas cobradas menos gastos."
            />
            {closing.missing.length > 0 && (
              <div role="status" className="flex items-start gap-3 rounded-md bg-warn p-4 text-warn-ink">
                <Warning size={28} aria-hidden="true" />
                <div>
                  {closing.missing.map((m) => (
                    <p key={m} className="font-semibold">{MISSING_TEXT[m] ?? `Falta: ${m}`}</p>
                  ))}
                  <p>La utilidad es estimada hasta que los captures.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6 border-t border-line pt-6">
              <Stat label="Ventas cobradas" value={mxn(closing.confirmed_sales_cents)} unit="MXN" size="sm" />
              <Stat label="Gastos" value={mxn(closing.expenses_cents)} unit="MXN" size="sm" />
            </div>
            <section className="flex flex-col gap-2">
              <SectionHeader title="Cobros pendientes" size="sm" />
              {closing.pending.length === 0 ? (
                <p className="text-ink-2">No tienes cobros pendientes.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-hairline">
                  {closing.pending.map((o) => (
                    <li key={o.id} className="flex min-h-14 items-center gap-4 py-2">
                      <Clock size={28} aria-hidden="true" />
                      <p className="flex-1 font-semibold">{o.concept}</p>
                      <p className="font-display">{mxn(o.amount_cents)}</p>
                      <Chip size="sm" tone="warn">Pendiente</Chip>
                    </li>
                  ))}
                </ul>
              )}
              <p className="flex items-center gap-2 text-[length:var(--text-s)] text-ink-2">
                <CheckCircle size={16} aria-hidden="true" />
                Los pendientes no suman a tus ventas.
              </p>
            </section>
          </>
        )}
      </PageLayout>
    </>
  );
}
