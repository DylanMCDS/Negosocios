import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle, Clock, ShieldCheck } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, Stat, Surface, SkeletonList } from "../../lib/ui";
import { FadeIn } from "../../lib/motion";
import { api } from "../../lib/api";
import { useSavedCoupons, discounted } from "../cupones";
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

interface Account {
  bank: string;
  last4: string;
  label: string;
}
const isAccount = (d: unknown): d is Account =>
  typeof d === "object" && d !== null && typeof (d as Account).bank === "string" && typeof (d as Account).last4 === "string";

function PagarScreen() {
  const orderId = readOrderId();
  const [order, setOrder] = useState<Order | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [missing, setMissing] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

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

  // Receiving account (simulated in this demo): only bank and last 4 are ever exposed.
  const businessId = business?.id;
  const { applied: coupon } = useSavedCoupons(businessId);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    api<unknown>(`/businesses/${encodeURIComponent(businessId)}/payout-account`).then(
      (d) => alive && setAccount(isAccount(d) ? d : null),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [businessId]);

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
        <SkeletonList rows={1} label="Cargando cobro" rowClassName="h-80" />
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
      <FadeIn className="mx-auto flex max-w-xl flex-col gap-8 py-2">
        <PageHeader title="Comprobante de pago" lead="CoDi confirmó tu pago." />
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
      </FadeIn>
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
            {account && (
              <p className="text-[length:var(--text-s)] text-ink-2">
                {`Recibe: ${business.name} · ${account.bank} · ****${account.last4} (${account.label})`}
              </p>
            )}
          </div>
          <Stat label="Importe" value={pesos(order.amount_cents)} unit="MXN" hero />
          <p>{order.concept}</p>
          {coupon && <p role="status" className="rounded-md bg-tint p-4">
            Cupón aplicado: {coupon.discount_pct}% de {coupon.issuer.name}. Pagarías {pesos(discounted(order.amount_cents, coupon.discount_pct))} en lugar de {pesos(order.amount_cents)}.</p>}
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

// From the direct link "/pagar/<id>" the app menu only sets the hash, and the shell would read the path again and stay here.
// So a menu choice moves the origin into the app ("/#<view>"). Module level on purpose: the shell swaps this screen out first.
const onDirectPath = () => /^\/pagar(\/|$)/.test(window.location.pathname);
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const view = window.location.hash.slice(1).split("/")[0];
    if (onDirectPath() && view && view !== "pagar") window.history.replaceState(null, "", `/#${view}`);
  });
}

// Inside the app ("#pagar/<id>") the owner gets a way out; a customer on the direct link does not see Volver.
export default function Pagar() {
  const inApp = !onDirectPath();
  return (
    <>
      {inApp && (
        <div className="mx-auto max-w-xl pt-2">
          <Button variant="secondary" size="sm" onClick={() => { window.location.hash = "cobrar"; }}>
            <ArrowLeft size={24} aria-hidden="true" />
            Volver
          </Button>
        </div>
      )}
      <PagarScreen />
    </>
  );
}
