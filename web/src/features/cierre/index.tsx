import { useEffect, useState } from "react";
import { CheckCircle, Clock, Warning } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { PromoSimulator } from "../../lib/discount";
import type { Closing } from "../../lib/types";
import { Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Stat } from "../../lib/ui";
import { mxn } from "../../lib/ui/locked/demoDay";
import { getBusinessId } from "../negocio/businessId";
import Recomendaciones from "./Recomendaciones";

const DEMO_BUSINESS_ID = "rosa"; // negocio de la jornada de ejemplo cuando aún no hay alta en este navegador

const MISSING_TEXT: Record<string, string> = {
  sales: "Faltan tus ventas cobradas",
  expenses: "Faltan tus gastos",
};

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
      <PageLayout aside={<PromoSimulator />}>
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
            <Recomendaciones businessId={getBusinessId() ?? DEMO_BUSINESS_ID} />
          </>
        )}
      </PageLayout>
    </>
  );
}
