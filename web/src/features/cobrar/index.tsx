import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowClockwise, Backspace, CheckCircle, QrCode } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, PageLayout, Stat, Surface } from "../../lib/ui";
import { api } from "../../lib/api";
import { appendKey, formatCents, toCents } from "./amount";
import { DEMO_BUSINESS_ID, getBusinessId, resolveActiveBusiness } from "../../lib/business";
import type { Order } from "../../lib/types";

const POLL_MS = 2000;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

type Phase = "idle" | "creating" | "pending" | "paid" | "failed";

const pesos = formatCents;

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
  // null while a saved business is being checked against the server; no saved business = the demo one.
  const [active, setActive] = useState<{ id: string; name: string | null } | null>(() =>
    getBusinessId() ? null : { id: DEMO_BUSINESS_ID, name: null },
  );
  useEffect(() => {
    if (getBusinessId()) void resolveActiveBusiness().then(setActive);
  }, []);
  const amountCents = toCents(digits);

  const create = useCallback(async () => {
    setPhase("creating");
    try {
      const created = await api<Order>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          business_id: active?.id ?? DEMO_BUSINESS_ID,
          amount_cents: amountCents,
          concept: concept.trim().slice(0, 40) || "Cobro",
          currency: "MXN",
        }),
      });
      setOrder(created);
      setPhase(created.status === "paid" ? "paid" : "pending");
    } catch {
      setPhase("failed");
    }
  }, [amountCents, concept, active]);

  const charge = () => {
    idempotencyKey.current = crypto.randomUUID();
    void create();
  };
  // Retry reuses the same key: pey never creates a second QR for the same charge.
  const retry = () => void create();

  const reset = () => {
    setDigits("");
    setConcept("");
    setOrder(null);
    setPhase("idle");
  };

  const orderId = order?.id;
  useEffect(() => {
    if (phase !== "pending" || !orderId) return;
    const timer = setInterval(async () => {
      try {
        const { order: fresh } = await api<{ order: Order }>(`/orders/${orderId}`);
        if (fresh.status === "paid") {
          setOrder(fresh);
          setPhase("paid");
          celebrate();
        } else if (fresh.status === "expired" || fresh.status === "failed") {
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

  return (
    <>
      <PageHeader
        title="Cobrar"
        action={active && <Chip>{active.name ?? "Puesto de ejemplo"}</Chip>}
        lead={showOrder ? "Muestra el QR. Tu cliente paga con su celular." : "Escribe el importe y cobra."} />
      <PageLayout
        aside={
          <Surface className="flex flex-col gap-6">
            <Stat label="Importe" value={pesos(order ? order.amount_cents : amountCents)} unit="MXN" hero />
            {showOrder ? (
              <>
                <p className="text-ink-2">{order.concept}</p>
                <div aria-live="polite">
                  {phase === "paid" ? <Chip tone="ok">{`Pagado ${pesos(order.amount_cents)}`}</Chip> : <Chip tone="warn">Pendiente</Chip>}
                </div>
                {phase === "pending" && (
                  <a className="text-ink-2 underline" href={`/pagar/${order.id}`}>
                    Abrir página de pago
                  </a>
                )}
                {phase === "paid" && (
                  <Button variant="secondary" onClick={reset}>
                    <CheckCircle size={24} aria-hidden="true" />
                    Cobrar otra orden
                  </Button>
                )}
              </>
            ) : (
              <>
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
                  <Button onClick={charge} disabled={amountCents <= 0 || phase === "creating" || !active}>
                    <QrCode size={24} aria-hidden="true" />
                    Cobrar
                  </Button>
                )}
              </>
            )}
          </Surface>
        }
      >
        {showOrder && order.qr_string ? (
          <div className="relative flex justify-center rounded-lg border border-line bg-tint p-6 md:p-12">
            <QrCubes value={order.qr_string} dim={phase === "paid"} />
            {phase === "paid" && (
              <p className="absolute inset-0 grid place-content-center text-center font-display text-[length:var(--text-2xl)] text-accent md:text-[length:var(--text-hero)]">
                Pagado
              </p>
            )}
          </div>
        ) : (
          <div className="grid max-w-[420px] grid-cols-3 gap-3" role="group" aria-label="Teclado numérico">
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
        )}
      </PageLayout>
    </>
  );
}
