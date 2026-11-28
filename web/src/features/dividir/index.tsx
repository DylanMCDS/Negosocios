import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight, CheckCircle, Minus, Plus, QrCode } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { Business, Closing, Order } from "../../lib/types";
import { Button, Chip, DataBadge, PageHeader, Stat, Surface } from "../../lib/ui";
import { mxn } from "../../lib/ui/locked/demoDay";
import { getBusinessId } from "../negocio/businessId";
import QrCubes from "./QrCubes";

const DEMO_BUSINESS_ID = "rosa";
const POLL_MS = 3000;
const MIN_PARTS = 2;
const MAX_PARTS = 20;
const shell = "mx-auto flex max-w-xl flex-col gap-8 py-2";
const field = "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] font-display";

interface Part {
  idx: number;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  codi_qr_id: string;
  qr_string: string | null;
}
interface Split {
  order_id: string;
  parts: Part[];
  total_cents: number;
  paid_cents: number;
  missing: number[];
}

const isSplit = (d: unknown): d is Split => typeof d === "object" && d !== null && Array.isArray((d as Split).parts);
const toCents = (pesos: string) => Math.round(Number(pesos.replace(",", ".")) * 100);

/** Equal parts in integer centavos: the leftover cents go to the first part (same rule as the server). */
function equalParts(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  return [base + (total - base * n), ...Array<number>(n - 1).fill(base)];
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const [, orderId, idx] = hash.replace(/^#/, "").split("/");
  return { orderId: orderId || null, idx: idx ? Number(idx) : null };
}

/** Split of an order, refreshed every few seconds until every part is paid. */
function useSplit(orderId: string) {
  const [split, setSplit] = useState<Split | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const d = await api<unknown>(`/orders/${encodeURIComponent(orderId)}/split`);
      if (isSplit(d)) setSplit(d);
    } catch {
      /* 404: not split yet */
    } finally {
      setLoaded(true);
    }
  }, [orderId]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = split !== null && split.missing.length > 0;
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [open, load]);
  return { split, setSplit, loaded };
}

function useOrder(orderId: string) {
  const [data, setData] = useState<{ order: Order; business: Business } | null>(null);
  useEffect(() => {
    api<{ order: Order; business: Business }>(`/orders/${encodeURIComponent(orderId)}`).then(setData, () => undefined);
  }, [orderId]);
  return data;
}

function PendingList() {
  const [pending, setPending] = useState<Order[] | null>(null);
  useEffect(() => {
    api<Closing>(`/closing/today?business_id=${encodeURIComponent(getBusinessId() ?? DEMO_BUSINESS_ID)}`).then(
      (c) => setPending(c.pending),
      () => setPending([]),
    );
  }, []);
  return (
    <div className={shell}>
      <PageHeader title="Dividir un cobro" lead="Cada quien paga su parte directo al negocio, con su propio QR." />
      <Surface className="flex flex-col gap-2">
        {pending === null && <p className="text-ink-2">Cargando tus cobros…</p>}
        {pending?.length === 0 && <p className="text-ink-2">No tienes cobros pendientes. Crea uno en Cobrar.</p>}
        <ul className="flex flex-col divide-y divide-hairline">
          {pending?.map((o, i) => (
            <li key={o.id} className="flex min-h-14 items-center gap-4 py-2">
              <p className="flex-1 font-semibold">{o.concept}</p>
              <p className="font-display">{mxn(o.amount_cents)}</p>
              <Button size="sm" variant={i === 0 ? "primary" : "secondary"} onClick={() => (window.location.hash = `dividir/${o.id}`)}>
                Dividir
              </Button>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}

function SplitForm({ orderId, total, concept, onDone }: { orderId: string; total: number; concept: string; onDone: (s: Split) => void }) {
  const [n, setN] = useState(MIN_PARTS);
  const [custom, setCustom] = useState(false);
  const [values, setValues] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const resize = (next: number) => {
    setN(next);
    setValues((v) => Array.from({ length: next }, (_, i) => v[i] ?? ""));
  };
  const amounts = custom ? values.map(toCents) : equalParts(total, n);
  const sum = amounts.reduce((s, a) => s + (Number.isFinite(a) ? a : 0), 0);
  const diff = total - sum;
  // Every part is at least $0.01, so the number of parts can never exceed the amount in cents.
  const maxParts = Math.max(1, Math.min(MAX_PARTS, total));
  const partsOk = amounts.every((a) => Number.isFinite(a) && a >= 1) && (custom || n <= total);
  const valid = custom ? diff === 0 && partsOk : partsOk;

  async function create() {
    setBusy(true);
    setFailed(false);
    try {
      const body = custom ? { amounts_cents: amounts } : { parts: n };
      const d = await api<unknown>(`/orders/${encodeURIComponent(orderId)}/split`, { method: "POST", body: JSON.stringify(body) });
      if (isSplit(d)) onDone(d);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={shell}>
      <PageHeader title="Dividir un cobro" lead={`${concept} · ${mxn(total)}`} />
      <Surface className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold">¿En cuántas partes?</p>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" aria-label="Menos partes" disabled={n <= MIN_PARTS} onClick={() => resize(n - 1)}>
              <Minus size={20} aria-hidden="true" />
            </Button>
            <span className="min-w-8 text-center font-display text-[length:var(--text-l)]" aria-live="polite">{n}</span>
            <Button size="sm" variant="ghost" aria-label="Más partes" disabled={n >= maxParts} onClick={() => resize(n + 1)}>
              <Plus size={20} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={custom ? "secondary" : "primary"} onClick={() => setCustom(false)}>Partes iguales</Button>
          <Button size="sm" variant={custom ? "primary" : "secondary"} onClick={() => setCustom(true)}>Montos distintos</Button>
        </div>
        <ul className="flex flex-col divide-y divide-hairline">
          {amounts.map((a, i) => (
            <li key={i} className="flex min-h-14 items-center gap-4 py-2">
              <p className="flex-1 text-ink-2">{`Parte ${i + 1}`}</p>
              {custom ? (
                <input
                  className={`${field} max-w-40`}
                  inputMode="decimal"
                  aria-label={`Importe de la parte ${i + 1}`}
                  value={values[i] ?? ""}
                  onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                />
              ) : (
                <p className="font-display">{mxn(a)}</p>
              )}
            </li>
          ))}
        </ul>
        {custom && diff !== 0 && (
          <p role="status" className="font-semibold">{diff > 0 ? `Faltan ${mxn(diff)}` : `Sobran ${mxn(-diff)}`}</p>
        )}
        {!partsOk && <p role="status" className="font-semibold">Cada parte debe ser de al menos $0.01</p>}
        <Button onClick={create} disabled={!valid || busy}>Crear cobros</Button>
        {failed && <p role="alert">No pudimos crear los cobros. Intenta de nuevo.</p>}
      </Surface>
    </div>
  );
}

/** "Pedir por celular" for one part: the same CoDi push Cobrar uses, addressed to the part ("<orden>-<n>"). */
function PartPush({ orderId, idx }: { orderId: string; idx: number }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "sent"; last4: string } | { kind: "error" }>({ kind: "idle" });
  const digits = phone.replace(/\D/g, "");
  async function send() {
    setState({ kind: "idle" });
    try {
      const res = await api<{ phone_last4: string }>(`/orders/${encodeURIComponent(`${orderId}-${idx}`)}/push`, { method: "POST", body: JSON.stringify({ phone: digits }) });
      setState({ kind: "sent", last4: res.phone_last4 });
    } catch {
      setState({ kind: "error" });
    }
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-surface px-5 font-display text-[length:var(--text-s)] text-accent hover:bg-hairline"
      >
        Pedir por celular
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <label className="flex flex-col gap-1 text-[length:var(--text-s)] text-ink-2">
        Celular de tu cliente (10 dígitos)
        <input className={field} type="tel" inputMode="tel" autoComplete="tel-national" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <Button size="sm" disabled={digits.length !== 10} onClick={() => void send()}>Enviar</Button>
      {state.kind === "sent" && <p aria-live="polite" className="rounded-md bg-ok p-3 text-ok-ink">{`Enviamos el cobro al celular terminado en ${state.last4}. Tu cliente lo aprueba en su app.`}</p>}
      {state.kind === "error" && <p role="alert" className="rounded-md bg-bad p-3 text-bad-ink">No pudimos enviar el cobro al celular. Muestra el QR.</p>}
    </div>
  );
}

/** One big QR per screen. Paying a part turns its card green, says so, and moves on to the next pending part. */
function PartsCarousel({ orderId, split }: { orderId: string; split: Split }) {
  const n = split.parts.length;
  const [current, setCurrent] = useState(() => Math.max(0, split.parts.findIndex((p) => p.status !== "paid")));
  const [notice, setNotice] = useState<string | null>(null);
  const paidKey = split.parts.filter((p) => p.status === "paid").map((p) => p.idx).join(",");
  const seen = useRef(new Set(paidKey ? paidKey.split(",").map(Number) : []));
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const now = paidKey ? paidKey.split(",").map(Number) : [];
    const fresh = now.filter((i) => !seen.current.has(i));
    seen.current = new Set(now);
    if (fresh.length === 0) return;
    setNotice(`Parte ${fresh[0]} pagada`);
    const after = split.parts.findIndex((p, i) => p.status !== "paid" && i >= fresh[0] - 1);
    const any = split.parts.findIndex((p) => p.status !== "paid");
    setCurrent(after >= 0 ? after : Math.max(any, 0));
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
    // The poll hands over a new object every few seconds; only a change in who has paid matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidKey]);

  const go = (i: number) => setCurrent(Math.min(n - 1, Math.max(0, i)));
  return (
    <section className="flex flex-col gap-4">
      {notice && <p role="status" className="rounded-md bg-ok p-3 font-display text-ok-ink">{notice}</p>}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Partes del cobro"
        tabIndex={0}
        className="overflow-hidden rounded-lg"
        onKeyDown={(e) => { if (e.key === "ArrowLeft") go(current - 1); if (e.key === "ArrowRight") go(current + 1); }}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="flex transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `translateX(-${current * 100}%)` }}>
          {split.parts.map((p) => {
            const paid = p.status === "paid";
            return (
              <div key={p.idx} className="w-full shrink-0">
                <div className={`flex flex-col items-center gap-3 rounded-lg p-5 ${paid ? "bg-ok text-ok-ink" : "bg-tint"}`}>
                  <p className="font-display text-[length:var(--text-2xl)] leading-none">{mxn(p.amount_cents)}</p>
                  {paid ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <CheckCircle size={72} weight="fill" className="text-money" aria-hidden="true" />
                      <p className="font-display text-[length:var(--text-xl)]">Pagado ✓</p>
                    </div>
                  ) : (
                    p.qr_string && (
                      <div className="w-full rounded-md bg-surface p-3">
                        <QrCubes value={p.qr_string} label={`Código QR de la parte ${p.idx}`} className="mx-auto max-w-[240px] md:max-w-[340px]" />
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="secondary" aria-label="Parte anterior" className="hidden md:inline-flex" disabled={current === 0} onClick={() => go(current - 1)}><CaretLeft size={20} aria-hidden="true" /></Button>
        <div className="flex flex-col items-center">
        <p className="font-display text-[length:var(--text-body)]" aria-live="polite">{`Parte ${current + 1} de ${n}`}</p>
        <div className="flex justify-center gap-1">
        {split.parts.map((p, i) => (
          <button
            key={p.idx}
            type="button"
            aria-label={`Ir a la parte ${p.idx}${p.status === "paid" ? ", pagada" : ""}`}
            aria-current={i === current ? "true" : undefined}
            onClick={() => go(i)}
            className="grid size-11 cursor-pointer place-items-center"
          >
            <span className={`block rounded-full ${i === current ? "size-4" : "size-3"} ${p.status === "paid" ? "bg-money" : i === current ? "bg-accent" : "bg-line"}`} />
          </button>
        ))}
        </div>
        </div>
        <Button size="sm" variant="secondary" aria-label="Parte siguiente" className="hidden md:inline-flex" disabled={current === n - 1} onClick={() => go(current + 1)}><CaretRight size={20} aria-hidden="true" /></Button>
      </div>
      {split.parts[current].status !== "paid" && (
        <div key={current} className="flex flex-col items-center gap-1">
          <PartPush orderId={orderId} idx={split.parts[current].idx} />
          <a className="inline-flex min-h-11 items-center px-3 underline underline-offset-4" href={`#dividir/${orderId}/${split.parts[current].idx}`}>
            Abrir página de pago
          </a>
        </div>
      )}
    </section>
  );
}

function PartsView({ orderId, split, demo }: { orderId: string; split: Split; demo: boolean }) {
  const done = split.missing.length === 0;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-2">
      {done ? (
        <PageHeader title="Cobro completo" lead="Todas las partes están pagadas." action={demo ? <DataBadge /> : undefined} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 font-display text-[length:var(--text-l)] leading-tight md:text-[length:var(--text-xl)]">{`Faltan ${split.missing.length} de ${split.parts.length}`}</h1>
          {demo && <span className="shrink-0 whitespace-nowrap"><DataBadge /></span>}
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:items-start">
        {done ? (
          <section className="flex flex-col items-center gap-3 rounded-lg bg-ok p-8 text-ok-ink">
            <CheckCircle size={72} weight="fill" className="text-money" aria-hidden="true" />
            <p className="font-display text-[length:var(--text-xl)]">Cuenta completa</p>
            <p className="font-display text-[length:var(--text-2xl)] leading-none">{mxn(split.total_cents)}</p>
          </section>
        ) : (
          <PartsCarousel orderId={orderId} split={split} />
        )}
        <div className="flex flex-col gap-6">
          <Stat label="Pagado hasta ahora" value={mxn(split.paid_cents)} unit={`de ${mxn(split.total_cents)}`} size="sm" />
          <ul className="flex flex-col divide-y divide-hairline">
            {split.parts.map((p) => (
              <li key={p.idx} className="flex min-h-14 items-center gap-4 py-3">
                {p.status === "paid" ? (
                  <CheckCircle size={32} weight="fill" className="shrink-0 text-money" aria-hidden="true" />
                ) : (
                  <QrCode size={32} className="shrink-0 text-accent" aria-hidden="true" />
                )}
                <p className="flex-1 font-semibold">{`Parte ${p.idx}`}</p>
                <p className="font-display">{mxn(p.amount_cents)}</p>
                {p.status === "paid" ? (
                  <Chip tone="ok" size="sm"><CheckCircle size={16} className="mr-1" aria-hidden="true" />Pagado</Chip>
                ) : (
                  <Chip size="sm">Pendiente</Chip>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PartPage({ orderId, idx }: { orderId: string; idx: number }) {
  const { split } = useSplit(orderId);
  const data = useOrder(orderId);
  const part = split?.parts.find((p) => p.idx === idx);
  if (!split || !data || !part) {
    return (
      <div className={shell} aria-busy="true">
        <PageHeader title="Cargando tu parte" />
      </div>
    );
  }
  const paid = part.status === "paid";
  const demo = data.order.demo_data || data.business.demo_data;
  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-2 md:grid-cols-[1fr_440px] md:items-center">
      <div className="flex flex-col gap-6">
        <PageHeader title={paid ? "Pago confirmado" : "Paga tu parte"} lead={`Parte ${idx} de ${split.parts.length}`} action={demo ? <DataBadge /> : undefined} />
        <div>
          <p className="text-[length:var(--text-s)] text-ink-2">Pagas a</p>
          <p className="font-display text-[length:var(--text-xl)] leading-tight">{data.business.name}</p>
        </div>
        <Stat label="Tu parte" value={mxn(part.amount_cents)} unit="MXN" hero />
        {paid && <Chip tone="ok"><CheckCircle size={20} className="mr-2" aria-hidden="true" />Pagado</Chip>}
      </div>
      {!paid && part.qr_string && (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-tint p-6">
          <div className="w-full rounded-md bg-surface p-4">
            <QrCubes value={part.qr_string} label={`Código QR de la parte ${idx}`} className="mx-auto max-w-[360px]" />
          </div>
          <p className="text-ink-2" aria-live="polite">Esperando tu pago…</p>
        </div>
      )}
    </div>
  );
}

function OrderSplit({ orderId }: { orderId: string }) {
  const { split, setSplit, loaded } = useSplit(orderId);
  const data = useOrder(orderId);
  if (split) return <PartsView orderId={orderId} split={split} demo={Boolean(data && (data.order.demo_data || data.business.demo_data))} />;
  if (!loaded || !data) {
    return (
      <div className={shell} aria-busy="true">
        <PageHeader title="Cargando cobro" />
      </div>
    );
  }
  return <SplitForm orderId={orderId} total={data.order.amount_cents} concept={data.order.concept} onDone={setSplit} />;
}

export default function Dividir() {
  const { orderId, idx } = useHashRoute();
  if (!orderId) return <PendingList />;
  if (idx !== null && Number.isInteger(idx) && idx >= 1) return <PartPage orderId={orderId} idx={idx} />;
  return <OrderSplit orderId={orderId} />;
}
