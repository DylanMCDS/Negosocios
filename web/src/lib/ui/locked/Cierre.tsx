import { CheckCircle, Clock } from "@phosphor-icons/react";
import { Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Stat, Surface } from "..";
import { demoDay, mxn } from "./demoDay";

export default function Cierre() {
  const sales = demoDay.orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount_cents, 0);
  const spent = demoDay.expenses.reduce((s, e) => s + e.amount_cents, 0);
  const pending = demoDay.orders.filter((o) => o.status === "pending");
  return (
    <>
      <PageHeader title="Cierre del día" lead={`${demoDay.business} · 26 nov 2026`} action={<DataBadge />} />
      <PageLayout
        aside={
          <Surface className="flex flex-col gap-6">
            <SectionHeader title="Gastos" size="sm" />
            <ul className="flex flex-col divide-y divide-hairline">
              {demoDay.expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{e.category}</p>
                    <p className="text-[length:var(--text-s)] text-ink-2">{e.description}</p>
                  </div>
                  <p className="font-display">{mxn(e.amount_cents)}</p>
                </li>
              ))}
            </ul>
          </Surface>
        }
      >
        <Stat label="Utilidad estimada" value={mxn(sales - spent)} unit="MXN" hero note="Ventas pagadas menos gastos." />
        <div className="grid grid-cols-2 gap-6 border-t border-line pt-6">
          <Stat label="Ventas confirmadas" value={mxn(sales)} unit="MXN" size="sm" />
          <Stat label="Gastos" value={mxn(spent)} unit="MXN" size="sm" />
        </div>
        <section className="flex flex-col gap-2">
          <SectionHeader title="Cobros" size="sm" />
          <ul className="flex flex-col divide-y divide-hairline">
            {demoDay.orders.map((o) => (
              <li key={o.id} className="flex min-h-14 items-center gap-4 py-2">
                {o.status === "paid" ? <CheckCircle size={28} aria-hidden="true" /> : <Clock size={28} aria-hidden="true" />}
                <div className="flex-1">
                  <p className="font-semibold">{o.concept}</p>
                  <p className="text-[length:var(--text-s)] text-ink-2">{o.time}</p>
                </div>
                <p className="font-display">{mxn(o.amount_cents)}</p>
                <Chip size="sm" tone={o.status === "paid" ? "ok" : "warn"}>
                  {o.status === "paid" ? "Pagado" : "Pendiente"}
                </Chip>
              </li>
            ))}
          </ul>
          <p className="text-[length:var(--text-s)] text-ink-2">
            {pending.length} cobro pendiente: no suma a las ventas.
          </p>
        </section>
      </PageLayout>
    </>
  );
}
