import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowClockwise, Backspace, CheckCircle, QrCode } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, Stat, Surface } from "../../lib/ui";
import { api } from "../../lib/api";
import { appendKey, formatCents, formatTyping, toCents } from "./amount";
import { DEMO_BUSINESS_ID, getBusinessId, resolveActiveBusiness } from "../../lib/business";
import type { Order } from "../../lib/types";

interface Referral { id: string; giver: string; giver_name: string; status: string; discount_pct: number }
interface Quote { applied: boolean; total_cents: number; discount_cents: number; reason: string | null }
// Estimate shown before charging; the allied quote at charge time is authoritative (it also caps the discount).
const estimateDiscount = (cents: number, pct: number) => Math.floor((cents * Math.round(pct * 100)) / 10000);

const POLL_MS = 2000;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

type Phase = "idle" | "creating" | "pending" | "paid" | "failed";

const pesos = formatCents;

// Orders waiting for payment survive a change of screen: only their ids are kept, the server holds the rest.
const PENDING_KEY = "negosocios.cobrar.pending";
const readPending = (): string[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const writePending = (ids: string[]) => localStorage.setItem(PENDING_KEY, JSON.stringify(ids.slice(-20)));
const forgetPending = (id: string) => writePending(readPending().filter((x) => x !== id));

// Sound and vibration are best effort: a phone may block either.
function celebrate() {
  try {
    navigator.vibrate?.([200, 80, 200]);
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* ignore */
  }
}

// Sends the charge to the customer's phone as a CoDi push; payment still arrives through the same order polling.
function PushToPhone({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "sent"; last4: string } | { kind: "error" }>({ kind: "idle" });
  const digits = phone.replace(/\D/g, "");
  const send = async () => {
    setState({ kind: "idle" });
    try {
      const res = await api<{ phone_last4: string }>(`/orders/${orderId}/push`, { method: "POST", body: JSON.stringify({ phone: digits }) });
      setState({ kind: "sent", last4: res.phone_last4 });
    } catch {
      setState({ kind: "error" });
    }
  };
  if (!open) {
    return <Button variant="secondary" size="sm" aria-label="Enviar al celular del cliente" onClick={() => setOpen(true)}>Pedir por celular</Button>;
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-ink-2">
        Celular del cliente (10 dígitos)
        <input className="min-h-14 rounded-lg border border-line bg-white px-4 text-ink" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} maxLength={14} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <Button variant="secondary" size="sm" onClick={() => void send()} disabled={digits.length !== 10}>Enviar</Button>
      {state.kind === "sent" && <p aria-live="polite" className="rounded-md bg-ok p-3 text-ok-ink">{`Enviamos el cobro al celular terminado en ${state.last4}. Tu cliente lo aprueba en su app.`}</p>}
      {state.kind === "error" && <p role="alert" className="rounded-md bg-bad p-3 text-bad-ink">No pudimos enviar el cobro al celular. Muestra el QR.</p>}
    </div>
  );
}

function QrCubes({ value, dim }: { value: string; dim: boolean }) {
  const { size, data } = useMemo(() => QRCode.create(value, { errorCorrectionLevel: "M" }).modules, [value]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="Código QR de cobro CoDi"
      className={`aspect-square w-full max-w-[420px] fill-ink transition-opacity duration-300 ${dim ? "opacity-15" : ""}`}
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

export default function Cobrar() {
  const [digits, setDigits] = useState("");
  const [concept, setConcept] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<Order | null>(null);
  const idempotencyKey = useRef<string>("");
  const chargeCents = useRef(0);
  const [refCode, setRefCode] = useState("");
  const [referral, setReferral] = useState<Referral | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  // null while a saved business is being checked against the server; no saved business = the demo one.
  const [active, setActive] = useState<{ id: string; name: string | null } | null>(() =>
    getBusinessId() ? null : { id: DEMO_BUSINESS_ID, name: null },
  );
  useEffect(() => {
    if (getBusinessId()) void resolveActiveBusiness().then(setActive);
  }, []);
  const amountCents = toCents(digits);
  const [waiting, setWaiting] = useState<Order[]>([]);
  useEffect(() => {
    const ids = readPending();
    if (ids.length === 0) return;
    let live = true;
    void Promise.all(
      ids.map((id) =>
        api<{ order: Order }>(`/orders/${encodeURIComponent(id)}`).then((r) => r.order, () => null),
      ),
    ).then((found) => {
      if (!live) return;
      const open = found.filter((o): o is Order => o !== null && o.status === "pending");
      writePending(open.map((o) => o.id));
      setWaiting(open);
    });
    return () => { live = false; };
  }, []);

  const create = useCallback(async () => {
    setPhase("creating");
    try {
      const created = await api<Order>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          business_id: active?.id ?? DEMO_BUSINESS_ID,
          amount_cents: chargeCents.current,
          concept: concept.trim().slice(0, 40) || "Cobro",
          currency: "MXN",
        }),
      });
      setOrder(created);
      if (created.status === "pending") writePending([...readPending().filter((x) => x !== created.id), created.id]);
      setPhase(created.status === "paid" ? "paid" : "pending");
    } catch {
      setPhase("failed");
    }
  }, [concept, active]);

  const applyCode = async () => {
    setRefError(null);
    try {
      const found = await api<Referral>(`/alliances/code/${encodeURIComponent(refCode.trim().toUpperCase())}`);
      if (found.status !== "active") setRefError("La alianza no está activa");
      else if (found.giver !== (active?.id ?? DEMO_BUSINESS_ID)) setRefError("Este código es de otro negocio");
      else setReferral(found);
    } catch {
      setRefError("Código no encontrado");
    }
  };

  const charge = async () => {
    idempotencyKey.current = crypto.randomUUID();
    chargeCents.current = amountCents;
    if (referral) {
      // The benefit is reserved against the order's Idempotency-Key, so a retry of the same charge never spends it twice.
      setPhase("creating");
      try {
        const quote = await api<Quote>(`/alliances/${referral.id}/quote`, {
          method: "POST",
          body: JSON.stringify({ amount_cents: amountCents, order_id: idempotencyKey.current }),
        });
        if (!quote.applied) {
          setRefError(quote.reason ?? "La alianza no pudo aplicar el descuento");
          setReferral(null);
          setPhase("idle");
          return;
        }
        chargeCents.current = quote.total_cents;
      } catch {
        setPhase("failed");
        return;
      }
    }
    void create();
  };
  // Retry reuses the same key: pey never creates a second QR for the same charge.
  const retry = () => void create();

  const reset = () => {
    setDigits("");
    setConcept("");
    setRefCode("");
    setReferral(null);
    setRefError(null);
    setOrder(null);
    setPhase("idle");
  };
  const openWaiting = (o: Order) => {
    idempotencyKey.current = o.idempotency_key;
    setWaiting((list) => list.filter((x) => x.id !== o.id));
    setOrder(o);
    setPhase("pending");
  };

  const orderId = order?.id;
  useEffect(() => {
    if (phase !== "pending" || !orderId) return;
    const timer = setInterval(async () => {
      try {
        const { order: fresh } = await api<{ order: Order }>(`/orders/${orderId}`);
        if (fresh.status === "paid") {
          forgetPending(fresh.id);
          setOrder(fresh);
          setPhase("paid");
          celebrate();
        } else if (fresh.status === "expired" || fresh.status === "failed") {
          forgetPending(fresh.id);
          setOrder(fresh);
          setPhase("failed");
        }
      } catch {
        /* keep polling: a lost request is not a failed charge */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, orderId]);

  const showOrder = order && (phase === "pending" || phase === "paid");

  const keypad = (
    <div className="grid w-full max-w-[420px] grid-cols-3 gap-3" role="group" aria-label="Teclado numérico">
      {KEYS.map((k) => (
        <Button key={k} variant="secondary" onClick={() => setDigits((d) => appendKey(d, k))}>
          {k}
        </Button>
      ))}
      <Button variant="secondary" onClick={() => setDigits((d) => appendKey(d, "."))} aria-label=".">
        .
      </Button>
      <Button variant="secondary" onClick={() => setDigits((d) => appendKey(d, "0"))}>
        0
      </Button>
      <Button variant="secondary" onClick={() => setDigits((d) => d.slice(0, -1))} aria-label="Borrar">
        <Backspace size={24} aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Cobrar"
        action={active && <Chip>{active.name ?? "Puesto de ejemplo"}</Chip>}
        lead={showOrder ? "Muestra el QR. Tu cliente paga con su celular." : "Escribe el importe y cobra."} />
      {/* Mobile: amount on top, keypad under it, Cobrar fixed above the bottom nav (bottom-16 = nav height). pb leaves room for both. */}
      <div data-cobrar-page className="grid gap-6 py-6 pb-28 md:gap-8 md:py-8 md:pb-0 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
              {waiting.length > 0 && (
                <Surface className="flex flex-col gap-2 p-4" aria-live="polite">
                  <p className="font-display">{waiting.length === 1 ? "Tienes 1 cobro pendiente" : `Tienes ${waiting.length} cobros pendientes`}</p>
                  {waiting.map((o) => (
                    <Button key={o.id} variant="secondary" onClick={() => openWaiting(o)}>
                      {`${pesos(o.amount_cents)} · ${o.concept}`}
                    </Button>
                  ))}
                  <a className="inline-flex min-h-11 items-center text-ink-2 underline" href="#cierre">Ir a Cierre</a>
                </Surface>
              )}
          <Surface className={showOrder ? "order-2 flex flex-col gap-4 lg:order-1" : "flex flex-col gap-4"}>
            <Stat label="Importe" value={order ? pesos(order.amount_cents) : formatTyping(digits)} unit="MXN" hero />
            {showOrder && (
              <>
                <p className="text-ink-2">{order.concept}</p>
                <div aria-live="polite">
                  {phase === "paid" ? <Chip tone="ok">{`Pagado ${pesos(order.amount_cents)}`}</Chip> : <Chip tone="warn">Pendiente</Chip>}
                </div>
              </>
            )}
          </Surface>
          {showOrder && order.qr_string ? (
            <div className="order-1 relative flex justify-center rounded-lg lg:order-2 border border-line bg-tint p-3 md:p-12">
              <QrCubes value={order.qr_string} dim={phase === "paid"} />
            </div>
          ) : (
            keypad
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          {showOrder ? (
            <>
              {phase === "pending" && (
                <a className="inline-flex min-h-11 items-center text-ink-2 underline" href={`/pagar/${order.id}`}>
                  Abrir página de pago
                </a>
              )}
              {phase === "pending" && <PushToPhone orderId={order.id} />}
              {phase === "pending" && order.amount_cents > 1 && (
                <Button variant="secondary" onClick={() => { window.location.hash = `dividir/${order.id}`; }}>
                  Dividir este cobro
                </Button>
              )}
              {phase === "paid" && (
                <div role="status" className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-bg p-6 text-center">
                  <CheckCircle size={96} weight="fill" aria-hidden="true" className="text-ok-ink" />
                  <p className="font-display text-[length:var(--text-hero)] text-ok-ink">Pagado</p>
                  <p className="font-display text-[length:var(--text-2xl)]">{pesos(order.amount_cents)}</p>
                  <Button className="w-full max-w-sm" onClick={reset}>
                    Cobrar otra orden
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Surface className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-ink-2">
                  Concepto
                  <input
                    className="min-h-14 rounded-lg border border-line bg-white px-4 text-ink"
                    maxLength={40}
                    value={concept}
                    placeholder="Orden de tacos"
                    onChange={(e) => setConcept(e.target.value)}
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-2 text-ink-2">
                    Cliente referido por (código)
                    <input
                      className="min-h-14 rounded-lg border border-line bg-white px-4 text-ink"
                      value={refCode}
                      maxLength={16}
                      autoCapitalize="characters"
                      placeholder="Código del aliado"
                      onChange={(e) => { setRefCode(e.target.value); setReferral(null); setRefError(null); }}
                    />
                  </label>
                  <p className="text-[length:var(--text-s)] text-ink-2">Te lo da tu cliente; viene de un negocio aliado</p>
                  <Button variant="secondary" size="sm" onClick={() => void applyCode()} disabled={refCode.trim() === ""}>Aplicar</Button>
                  {refError && <p role="alert">{refError}</p>}
                  {referral && (
                    <div className="flex flex-col gap-1">
                      <p className="text-ink-2">{`Aliado: ${referral.giver_name}`}</p>
                      <p>{`Precio ${pesos(amountCents)}`}</p>
                      <p>{`Descuento del aliado −${pesos(estimateDiscount(amountCents, referral.discount_pct))}`}</p>
                      <p className="font-semibold">{`Total ${pesos(amountCents - estimateDiscount(amountCents, referral.discount_pct))}`}</p>
                    </div>
                  )}
                </div>
              </Surface>
              {phase === "failed" && (
                <div role="alert" className="flex flex-col gap-3 text-ink">
                  <p>No pudimos crear el cobro. Tu cliente no ha pagado nada.</p>
                  <Button variant="secondary" onClick={retry}>
                    <ArrowClockwise size={24} aria-hidden="true" />
                    Reintentar
                  </Button>
                </div>
              )}
              {phase !== "failed" && (
                <div data-thumb-bar className="fixed inset-x-0 bottom-16 z-10 border-t border-hairline bg-surface p-3 shadow-bar md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                  <Button className="w-full" onClick={charge} disabled={amountCents <= 0 || phase === "creating" || !active}>
                    <QrCode size={24} aria-hidden="true" />
                    Cobrar
                  </Button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
