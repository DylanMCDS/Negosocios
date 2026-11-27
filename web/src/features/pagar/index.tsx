import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, Clock, ShieldCheck } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, Stat, Surface } from "../../lib/ui";
import { api } from "../../lib/api";
import type { Business, Order, Payment } from "../../lib/types";

const POLL_MS = 2000;

// The QR and the NFC sticker open /pagar/<orderId>; "#pagar/<orderId>" works inside the app shell.
function readOrderId(): string | null {
  const fromPath = window.location.pathname.match(/\/pagar\/([^/?#]+)/);
  if (fromPath) return decodeURIComponent(fromPath[1]);
  const fromHash = window.location.hash.match(/^#pagar\/([^/?#]+)/);
  return fromHash ? decodeURIComponent(fromHash[1]) : null;
}

const pesos = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

function QrCubes({ value }: { value: string }) {
  const { size, data } = useMemo(() => QRCode.create(value, { errorCorrectionLevel: "M" }).modules, [value]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="Código QR de cobro CoDi"
      className="aspect-square w-full max-w-[320px] fill-ink"
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

export default function Pagar() {
  const orderId = readOrderId();
  const [order, setOrder] = useState<Order | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [missing, setMissing] = useState(false);

  const status = order?.status;
  const [checking, setChecking] = useState(false);
  const load = async () => {
    if (!orderId) return;
    try {
      const res = await api<{ order: Order; business: Business }>(`/orders/${orderId}`);
      setOrder(res.order);
      setBusiness(res.business);
    } catch {
      if (!order) setMissing(true);
    }
  };
  const recheck = async () => {
    setChecking(true);
    await load();
    setChecking(false);
  };
  useEffect(() => {
    if (!orderId || status === "paid" || status === "expired" || status === "failed") return;
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
    // order is read only to avoid flagging a transient poll error as "not found"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, status]);

  // Receipt: the transaction id comes from the stored confirmation, never from the client.
  useEffect(() => {
    if (status !== "paid" || !orderId) return;
    let alive = true;
    api<{ order: Order; payment: Payment | null }>(`/payments/${orderId}/confirm`, { method: "POST" })
      .then((res) => alive && setPayment(res.payment))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [status, orderId]);

  if (!orderId) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8 py-2">
        <PageHeader title="Escanea el QR del puesto para pagar" lead="Abre la cámara de tu celular y apunta al QR del comerciante." />
      </div>
    );
  }
  if (missing) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8 py-2">
        <PageHeader title="No encontramos este cobro" lead="Pide al comerciante que genere otro QR." />
      </div>
    );
  }
  if (!order || !business) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8 py-2" aria-busy="true">
        <PageHeader title="Cargando cobro" />
      </div>
    );
  }

  if (order.status === "expired" || order.status === "failed") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8 py-2">
        <PageHeader
          title={order.status === "expired" ? "Este cobro expiró" : "Este cobro no se pudo completar"}
          lead="No se hizo ningún cargo. Pide otro cobro al comerciante."
        />
        <Surface className="flex flex-col gap-6">
          <Chip tone="warn">
            <Clock size={20} className="mr-2" aria-hidden="true" />
            Vencido
          </Chip>
          <div>
            <p className="text-[length:var(--text-s)] text-ink-2">Ibas a pagar a</p>
            <p className="font-display text-[length:var(--text-xl)] leading-tight">{business.name}</p>
          </div>
          <Stat label="Importe" value={pesos(order.amount_cents)} unit="MXN" hero />
          <p className="text-ink-2">{order.concept}</p>
        </Surface>
      </div>
    );
  }

  if (order.status === "paid") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-8 py-2">
        <PageHeader title="Comprobante de pago" lead="El comerciante ya recibió tu pago." />
        <Surface className="flex flex-col gap-6">
          <div>
            <p className="text-[length:var(--text-s)] text-ink-2">Pagaste a</p>
            <p className="font-display text-[length:var(--text-xl)] leading-tight">{business.name}</p>
          </div>
          <Stat label="Importe" value={pesos(order.amount_cents)} unit="MXN" hero />
          <p>{order.concept}</p>
          {order.paid_at && <p className="text-ink-2">{when(order.paid_at)}</p>}
          {payment && (
            <p className="text-[length:var(--text-s)] text-ink-2">
              Folio <span className="font-display text-ink">{payment.transaction_id}</span>
            </p>
          )}
          <Chip tone="ok">
            <CheckCircle size={20} className="mr-2" aria-hidden="true" />
            Pagado
          </Chip>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 py-2">
      <PageHeader title="Confirma tu pago" lead="Revisa a quién pagas y cuánto. Escanea el QR con tu app bancaria." />
      <div className="grid gap-6 md:grid-cols-2">
        <Surface className="flex flex-col gap-6">
          <div>
            <p className="text-[length:var(--text-s)] text-ink-2">Pagas a</p>
            <p className="font-display text-[length:var(--text-xl)] leading-tight">{business.name}</p>
            <p className="text-ink-2">{business.zone}</p>
          </div>
          <Stat label="Importe" value={pesos(order.amount_cents)} unit="MXN" hero />
          <p>{order.concept}</p>
          <Chip tone="ok">
            <ShieldCheck size={20} className="mr-2" aria-hidden="true" />
            Sin comisión con CoDi
          </Chip>
          <div className="flex flex-col gap-2">
            <Button onClick={() => void recheck()} disabled={checking}>
              Ya pagué: revisar
            </Button>
            <p className="flex items-center gap-2 text-ink-2" aria-live="polite">
              <Clock size={20} aria-hidden="true" />
              Esperando tu pago…
            </p>
          </div>
        </Surface>
        {order.qr_string && (
          <div className="flex items-center justify-center rounded-lg border border-line bg-tint p-6">
            <QrCubes value={order.qr_string} />
          </div>
        )}
      </div>
    </div>
  );
}
