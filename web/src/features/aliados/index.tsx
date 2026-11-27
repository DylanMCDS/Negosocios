import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { DEMO_BUSINESS_ID, getBusinessId } from "../../lib/business";
import { DiscountFields, PromoResult, emptyValues, promoNumbers, toCents, usePromoSimulation, validAmount, type DiscountValues } from "../../lib/discount";
import { Button, Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Stat, Surface } from "../../lib/ui";
import { mxn } from "../../lib/ui/locked/demoDay";
import AllianceCode from "./AllianceCode";

const CENTER = { lat: 19.432, lng: -99.133 }; // demo tianguis, same as Explorar
const field = "h-14 w-full rounded-md border border-line bg-surface px-3 text-[length:var(--text-body)] font-display";

interface Alliance {
  id: string;
  business_a: string;
  business_b: string;
  giver: string;
  status: "proposal" | "active" | "closed";
  discount_pct: number;
  budget_cents: number;
  budget_used_cents: number;
  max_uses: number;
  uses: number;
  referral_code: string;
  partner_id: string;
  partner_name: string;
  role: "giver" | "referrer";
  demo?: boolean;
}
interface Metrics {
  referrals: number;
  paid_purchases: number;
  paid_sales_cents: number;
  benefit_cost_cents: number;
  estimated_contribution_cents: number;
  note: string;
}
interface Partner { business_id: string; name: string; category: string; zone: string }
const STATUS = { proposal: "Propuesta", active: "Activa", closed: "Cerrada" } as const;

function Proposal({ me, partner, onDone }: { me: string; partner: Partner; onDone: (created: Alliance) => void }) {
  const [v, setV] = useState<DiscountValues>(emptyValues);
  const { sim, error: simError } = usePromoSimulation(v);
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState(false);

  // The slider stops at the maximum the simulator allows: a discount that loses money cannot be selected.
  const max = promoNumbers(v) && sim?.ok && sim.max_discount_pct !== null ? Math.floor(sim.max_discount_pct * 10) / 10 : 0;
  const value = Math.min(discount, max);
  const canSend = max > 0 && value > 0 && validAmount(v.budget) && toCents(v.budget) > 0 && Number(v.uses) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    try {
      const created = await api<Alliance>("/alliances", {
        method: "POST",
        body: JSON.stringify({
          business_a: me, business_b: partner.business_id, giver: me, discount_pct: value, budget_cents: toCents(v.budget),
          max_uses: Number(v.uses), price_cents: toCents(v.price), variable_cost_cents: toCents(v.cost), min_contribution_cents: toCents(v.margin),
        }),
      });
      onDone(created);
    } catch {
      setError(true);
    }
  }

  return (
    <Surface className="flex flex-col gap-4">
      <SectionHeader title={`Alianza con ${partner.name}`} size="sm" />
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <DiscountFields values={v} keys={["price", "cost", "margin", "budget", "uses"]} onChange={(k, val) => setV((o) => ({ ...o, [k]: val }))} />
        <label className="flex flex-col gap-2 text-[length:var(--text-s)] text-ink-2">
          <span>Descuento</span>
          <input type="range" className="accent-accent" min={0} max={max} step={0.1} value={value} disabled={max <= 0} onChange={(e) => setDiscount(Math.min(Number(e.target.value), max))} aria-label="Descuento" aria-valuetext={`${value} %`} />
          <span className="font-display text-[length:var(--text-l)] text-ink">{`${value} %`}</span>
        </label>
        <PromoResult values={v} sim={sim} error={simError} />
        <Button type="submit" disabled={!canSend}>Proponer</Button>
      </form>
      {error && <p role="alert">No pudimos proponer la alianza: la cuenta no alcanza o ya existe.</p>}
    </Surface>
  );
}

export default function Aliados() {
  const me = getBusinessId() ?? DEMO_BUSINESS_ID;
  const [alliances, setAlliances] = useState<Alliance[] | null>(null);
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Partner | null>(null);
  const [failed, setFailed] = useState(false);
  const timers = useRef<number[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await api<Alliance[]>(`/alliances?business_id=${encodeURIComponent(me)}`);
      setAlliances(list);
      setFailed(false);
      for (const a of list.filter((x) => x.status === "active")) {
        api<Metrics>(`/alliances/${a.id}/metrics`).then((m) => setMetrics((o) => ({ ...o, [a.id]: m })), () => undefined);
      }
    } catch {
      setFailed(true);
    }
  }, [me]);
  useEffect(() => {
    void load();
    api<Partner[]>(`/network?lat=${CENTER.lat}&lng=${CENTER.lng}&radius_km=5`).then(
      (list) => setPartners(list.filter((p) => p.business_id !== me)),
      () => undefined,
    );
  }, [load, me]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // A proposal to a demo business accepts itself after a few seconds: look again so the flow can be walked through.
  const afterProposal = (created: Alliance) => {
    setPicked(null);
    void load();
    if (created?.demo) timers.current.push(window.setTimeout(() => void load(), 4000));
  };

  const accept = async (a: Alliance) => {
    try {
      await api(`/alliances/${a.id}/accept`, { method: "POST" });
      await load();
    } catch {
      setFailed(true);
    }
  };

  const mine = (alliances ?? []).filter((a) => a.role === "giver");
  const sales = mine.reduce((sum, a) => sum + (metrics[a.id]?.paid_sales_cents ?? 0), 0);
  const note = Object.values(metrics)[0]?.note;
  const taken = new Set((alliances ?? []).map((a) => a.partner_id));
  const shown = partners.filter((p) => !taken.has(p.business_id) && p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <PageHeader title="Aliados" lead="Negocios que te mandan clientes a cambio de un descuento." />
      <PageLayout
        aside={
          <div className="flex flex-col gap-6">
            {picked ? (
              <Proposal me={me} partner={picked} onDone={afterProposal} />
            ) : (
              <Surface className="flex flex-col gap-4">
                <SectionHeader title="Buscar negocios de la red" size="sm" />
                <label className="flex flex-col gap-1 text-[length:var(--text-s)] text-ink-2">
                  Nombre
                  <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>
                <ul className="flex flex-col divide-y divide-hairline">
                  {shown.map((p) => (
                    <li key={p.business_id} className="flex min-h-14 items-center gap-3 py-2">
                      <span className="flex-1"><span className="block font-semibold">{p.name}</span><span className="block text-[length:var(--text-s)] text-ink-2">{p.category} · {p.zone}</span></span>
                      <Button variant="secondary" size="sm" aria-label={`Proponer alianza a ${p.name}`} onClick={() => setPicked(p)}>Proponer</Button>
                    </li>
                  ))}
                  {shown.length === 0 && <li className="py-2 text-ink-2">No hay más negocios para proponer.</li>}
                </ul>
              </Surface>
            )}
          </div>
        }
      >
        <Stat label="Las ventas que te trajeron tus aliados" value={mxn(sales)} unit="MXN" hero note={note} />
        {failed && <p role="alert">No pudimos cargar tus alianzas. Intenta de nuevo.</p>}
        <section className="flex flex-col gap-2">
          <SectionHeader title="Tus alianzas" size="sm" />
          {alliances && alliances.length === 0 && <p className="text-ink-2">Aún no tienes aliados. Propón una alianza a un negocio de la red.</p>}
          <ul className="flex flex-col divide-y divide-hairline">
            {(alliances ?? []).map((a) => {
              const m = metrics[a.id];
              return (
                <li key={a.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-3">
                    <p className="flex-1 font-semibold">{a.partner_name}</p>
                    {a.demo && <DataBadge size="sm" />}
                    <Chip size="sm" tone={a.status === "active" ? "ok" : "warn"}>{STATUS[a.status]}</Chip>
                  </div>
                  <p className="text-ink-2">{a.role === "giver" ? `Tú das ${a.discount_pct} % de descuento a sus clientes` : `Te refiere clientes con ${a.discount_pct} % de descuento`}</p>
                  <p className="text-[length:var(--text-s)] text-ink-2">{`Quedan ${a.max_uses - a.uses} usos y ${mxn(a.budget_cents - a.budget_used_cents)} de presupuesto`}</p>
                  {a.status === "proposal" && a.demo && a.business_b !== me && <p className="text-[length:var(--text-s)] text-ink-2">Negocio de ejemplo: aceptará solo en unos segundos.</p>}
                  {a.role === "giver" && a.status === "active" && <AllianceCode code={a.referral_code} />}
                  {a.role === "referrer" && a.status === "active" && <p className="text-[length:var(--text-s)]">{`Tus clientes reciben el código de ${a.partner_name}`}</p>}
                  {m && <p className="text-[length:var(--text-s)] text-ink-2">{`${m.referrals} referencias · ${m.paid_purchases} compras pagadas · beneficios dados ${mxn(m.benefit_cost_cents)} · contribución estimada ${mxn(m.estimated_contribution_cents)}`}</p>}
                  {a.status === "proposal" && a.business_b === me && (
                    <Button variant="secondary" size="sm" aria-label={`Aceptar propuesta de ${a.partner_name}`} onClick={() => void accept(a)}>Aceptar</Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </PageLayout>
    </>
  );
}
