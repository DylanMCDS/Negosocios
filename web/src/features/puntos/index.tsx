import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MapPin, Printer, QrCode, Door, CashRegister, Table, Plant, Bag } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { api, ApiError } from "../../lib/api";
import { saveCouponToken, useSavedCoupons, discounted, type Coupon } from "../cupones";
import { resolveActiveBusiness } from "../../lib/business";
import { Button, Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Surface } from "../../lib/ui";
import "./print.css";

type Kind = "entrance" | "cashier" | "table";
type Target = "profile" | "current" | "assigned";
type PointIcon = "pin" | "door" | "cash" | "table" | "plant" | "bag";
interface Business { id: string; name: string; demo_data: boolean }
interface Point { id: string; kind: Kind; label: string; path: string; active: boolean; demo_data: boolean; pending_count: number; icon?: PointIcon; target?: Target; assigned_orders?: Array<PendingOrder & { status: string }> }
interface PendingOrder { id: string; concept: string; amount_cents: number; url: string; demo_data?: boolean }
interface PointList { business: Business; points: Point[] }
interface Destination { point: Point; business: Business; mode: "profile" | "payment" | "choose" | "empty"; orders: PendingOrder[]; url: string }
const KIND: Record<Kind, string> = { entrance: "Entrada", cashier: "Caja", table: "Mesa" };
const ICONS = { pin: MapPin, door: Door, cash: CashRegister, table: Table, plant: Plant, bag: Bag };
const ICON_NAMES: Record<PointIcon, string> = { pin: "Punto", door: "Entrada", cash: "Caja", table: "Mesa", plant: "Terraza", bag: "Para llevar" };
const DEFAULTS: Record<Kind, { icon: PointIcon; target: Target; purpose: string; customer: string }> = {
  entrance: { icon: "door", target: "profile", purpose: "Da a conocer tu negocio.", customer: "La página del negocio" },
  cashier: { icon: "cash", target: "current", purpose: "Cobra donde atiendes.", customer: "El cobro del momento" },
  table: { icon: "table", target: "assigned", purpose: "Lleva el cobro a cada mesa.", customer: "El cobro que le asignes a esa mesa" },
};
const targetOf = (point: Point): Target => point.target ?? (point.kind === "entrance" ? "profile" : "assigned");
const statusName = (status: string) => ({ pending: "Pendiente", paid: "Pagado", expired: "Vencido", cancelled: "Cancelado", failed: "Fallido" })[status] ?? "No disponible";
const pesos = (cents: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
const NFC_GUIDE = "https://www.wakdev.com/en/knowledge-base/how-to-guides/how-to-write-a-link-url-on-an-nfc-chip.html";
const field = "h-14 w-full min-w-0 rounded-md border border-line bg-surface px-4 text-ink";
const clearPrint = () => {
  document.querySelectorAll("[data-point-print-copy]").forEach((node) => node.remove());
  delete document.body.dataset.printPoint;
};

function PointQr({ value, label }: { value: string; label: string }) {
  const { size, data } = useMemo(() => QRCode.create(value, { errorCorrectionLevel: "M" }).modules, [value]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return <svg data-point-qr viewBox={`-4 -4 ${size + 8} ${size + 8}`} role="img" aria-label={`QR del punto ${label}`}
    className="aspect-square w-full max-w-[360px] fill-ink" shapeRendering="crispEdges">
    {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
  </svg>;
}

type Claim = { kind: "saved"; coupon: Coupon } | { kind: "refused"; reason: string };
const REFUSED = "No pudimos guardar tu cupón ahora.";

// Sticker at the business that gives the benefit: claim it after a verified paid order; nothing is saved otherwise.
function useCouponClaim(token: string, destination: Destination | null) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const businessId = destination?.business.id;
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void (async () => {
      try {
        const list = await api<Array<{ id: string; status: string; role: string }>>(`/alliances?business_id=${encodeURIComponent(businessId)}`);
        const given = Array.isArray(list) ? list.find((a) => a.role === "giver" && a.status === "active") : undefined;
        if (!given) return;
        const coupon = await api<Coupon>("/coupons/claim", { method: "POST", body: JSON.stringify({ alliance_id: given.id, point_id: token }) });
        if (!alive) return;
        setClaim(saveCouponToken(coupon.token) ? { kind: "saved", coupon } : { kind: "refused", reason: REFUSED });
      } catch (reason) {
        if (alive && reason instanceof ApiError) setClaim({ kind: "refused", reason: reason.detail || REFUSED });
      }
    })();
    return () => { alive = false; };
  }, [token, businessId]);
  return claim;
}


export function PublicPoint({ token }: { token: string }) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const claim = useCouponClaim(token, destination);
  const { coupons, applied, choose } = useSavedCoupons(destination?.business.id);
  useEffect(() => {
    let alive = true;
    setDestination(null); setError("");
    api<Destination>(`/points/${encodeURIComponent(token)}/resolve`).then(
      (data) => alive && setDestination(data),
      (reason: Error) => alive && setError(reason.message.startsWith("410") ? "Este punto ya no está activo" :
        reason.message.startsWith("404") ? "No encontramos este punto" : "No pudimos abrir el punto"),
    );
    return () => { alive = false; };
  }, [token, attempt]);
  if (error) return <><PageHeader title={error} lead="Pide al negocio su enlace o QR actual." />
    <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Intentar de nuevo</Button></>;
  if (!destination) return <><PageHeader title="Abriendo punto" lead="Estamos buscando el puesto y sus cobros." /><p role="status">Cargando…</p></>;
  const { business, orders, mode } = destination;
  return <>
    <PageHeader title={mode === "choose" ? "Elige tu cobro" : mode === "profile" ? "Perfil del puesto" :
      mode === "empty" ? "No hay cobros pendientes" : "Revisa tu cobro"} lead="Confirma el receptor y el importe antes de pagar." />
    <Surface className="flex flex-col gap-6">
      <div><p className="text-ink-2">Pagas a</p><h2 className="text-[length:var(--text-l)]">{business.name}</h2></div>
      {(business.demo_data || orders.some((order) => order.demo_data)) && <div><DataBadge /></div>}
      {claim?.kind === "saved" && <div role="status" className="flex flex-col gap-2 rounded-md bg-tint p-4">
        <strong>Guardaste un cupón para {claim.coupon.redeem_at.name}</strong>
        <a className="inline-flex min-h-11 items-center text-accent underline" href="#cupones">Ver mis cupones</a></div>}
      {claim?.kind === "refused" && <div role="status" className="flex flex-col gap-1 rounded-md bg-tint p-4">
        <strong>No guardamos ningún cupón.</strong><span>{claim.reason}</span></div>}
      {applied && <div role="status" className="flex flex-col gap-3 rounded-md bg-tint p-4">
        <strong>Cupón aplicado: {applied.discount_pct}% de {applied.issuer.name}</strong>
        {orders.length === 1 && <span>Pagarías {pesos(discounted(orders[0].amount_cents, applied.discount_pct))} en lugar de {pesos(orders[0].amount_cents)}</span>}
        {coupons.length > 1 && <div className="flex flex-wrap gap-2">{coupons.map((c) => <Button key={c.token} size="sm"
          variant={c.token === applied.token ? "primary" : "secondary"} aria-pressed={c.token === applied.token} onClick={() => choose(c.token)}>
          {c.discount_pct}% de {c.issuer.name}</Button>)}</div>}
      </div>}
      {mode === "profile" && <a className="inline-flex min-h-14 items-center text-accent underline" href={destination.url}>Ver perfil</a>}
      {mode === "empty" && <p>Pide al comerciante que cree y asigne tu cobro a este punto.</p>}
      <ul className="divide-y divide-line">
        {orders.map((order) => <li key={order.id}><a href={order.url}
          className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-4 text-ink underline decoration-line underline-offset-4">
          <span>{order.concept}</span><strong className="font-display">{pesos(order.amount_cents)}</strong><span className="text-accent">Ver cobro</span>
        </a></li>)}
      </ul>
    </Surface>
  </>;
}

function ManagePoints() {
  const [businessId, setBusinessId] = useState("");
  const [data, setData] = useState<PointList | null>(null);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [kind, setKind] = useState<Kind>("cashier");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<PointIcon>("cash");
  const [target, setTarget] = useState<Target>("current");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState("");

  const loadVersion = useRef(0);
  const load = async (id: string) => {
    const version = ++loadVersion.current;
    const [list, pending] = await Promise.all([
      api<PointList>(`/points?business_id=${encodeURIComponent(id)}`),
      api<PendingOrder[]>(`/points/pending-orders?business_id=${encodeURIComponent(id)}`),
    ]);
    if (version !== loadVersion.current) return;
    setData(list); setOrders(pending); setFailed(false);
    setSelectedId((old) => list.points.some((p) => p.id === old) ? old : (list.points.find((p) => p.active) ?? list.points[0])?.id ?? "");
  };
  useEffect(() => {
    let alive = true;
    resolveActiveBusiness().then(async ({ id }) => {
      if (!alive) return;
      setBusinessId(id);
      try { await load(id); } catch { if (alive) setFailed(true); }
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; loadVersion.current++; };
  }, []);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    const timer = window.setInterval(() => {
      if (!alive || document.visibilityState === "hidden") return;
      void load(businessId).catch(() => { /* Keep the last list; announce stale status. */
        if (alive) setNotice("No pudimos actualizar los estados. Revisa tu conexión.");
      });
    }, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [businessId]);
  useEffect(() => {
    window.addEventListener("afterprint", clearPrint);
    return () => { window.removeEventListener("afterprint", clearPrint); clearPrint(); };
  }, []);
  const selected = data?.points.find((p) => p.id === selectedId);
  const url = selected ? new URL(selected.path, window.location.origin).href : "";
  const act = async (action: () => Promise<unknown>, message: string) => {
    loadVersion.current++;
    setBusy(true); setNotice("");
    try { await action(); await load(businessId); setNotice(message); }
    catch { setNotice("No se guardó el cambio. Revisa tu conexión e intenta de nuevo."); }
    finally { setBusy(false); }
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    void act(async () => {
      const point = await api<Point>("/points", { method: "POST", body: JSON.stringify({ business_id: businessId, kind, label, icon, target }) });
      setSelectedId(point.id); setLabel("");
    }, "Punto creado. Puedes imprimirlo o grabarlo en NFC.");
  };
  const print = () => {
    clearPrint();
    const source = document.querySelector("[data-point-print]");
    if (!source) return;
    const copy = source.cloneNode(true) as HTMLElement;
    copy.setAttribute("data-point-print-copy", "");
    copy.style.display = "none";
    document.body.append(copy);
    document.body.dataset.printPoint = "true";
    try { window.print(); } catch { clearPrint(); setNotice("Usa la opción Imprimir de tu navegador."); }
  };
  const copy = async () => {
    if (!navigator.clipboard) { setNotice("Selecciona y copia el enlace."); return; }
    try { await navigator.clipboard.writeText(url); setNotice("Enlace copiado."); }
    catch { setNotice("Selecciona y copia el enlace."); }
  };
  if (failed) return <><PageHeader title="Puntos" lead="Los enlaces de tu puesto, en QR o NFC." />
    <Surface><p role="alert">No pudimos cargar los puntos.</p><Button variant="secondary" onClick={() => void load(businessId).catch(() => setFailed(true))}>Reintentar</Button></Surface></>;
  if (!data) return <><PageHeader title="Puntos" lead="Los enlaces de tu puesto, en QR o NFC." /><p role="status">Cargando tu puesto…</p></>;
  return <>
    <PageHeader title="Puntos" lead="Un enlace para la entrada, cada caja y cada mesa." />
      <section className="flex flex-col gap-3 pt-8" aria-label="Puntos del puesto">
        <SectionHeader title="Puntos del puesto" />
        <a href="#crear-punto" onClick={(event) => { event.preventDefault(); const form = document.getElementById("crear-punto"); form?.scrollIntoView({ block: "start" }); form?.focus(); }}
          className="inline-flex min-h-11 items-center self-start text-accent underline">Crear un punto</a>
        <p className="text-ink-2">Elige un punto para ver su QR. Los estados se actualizan cada 5 segundos.</p>
        {data.business.demo_data && <div><DataBadge /></div>}
        {!data.points.length && <p>Aún no tienes puntos. Crea uno con el nombre de tu espacio.</p>}
        <ul className="divide-y divide-line">{data.points.map((point) => {
          const Icon = ICONS[point.icon ?? "pin"];
          const assigned = point.assigned_orders ?? [];
          return <li key={point.id}><button type="button" aria-pressed={selectedId === point.id}
            onClick={() => { setSelectedId(point.id); setNotice(""); }}
            className={`flex min-h-14 w-full flex-wrap items-center justify-between gap-3 rounded-md px-3 py-4 text-left ${selectedId === point.id ? "bg-tint" : ""}`}>
            <span className="flex items-center gap-3"><Icon size={24} aria-hidden="true" /><strong>{point.label}</strong></span>
            {!point.active ? <Chip size="sm" tone="bad">Revocado</Chip> : targetOf(point) === "profile" ? <span className="text-ink-2">Página del negocio</span> :
              assigned.length ? <span className="flex flex-col gap-2">{assigned.map((order) => <span key={order.id} className="flex items-center gap-3">
                <strong>{pesos(order.amount_cents)}</strong><Chip size="sm" tone={order.status === "paid" ? "ok" : order.status === "pending" ? "warn" : "neutral"}>{statusName(order.status)}</Chip>
              </span>)}</span> : <span className="text-ink-2">Sin cobro asignado</span>}
          </button></li>;
        })}</ul>
      </section>
    <PageLayout aside={<>
      <section id="crear-punto" tabIndex={-1} className="flex flex-col gap-4">
        <SectionHeader title="Crear punto" />
        <form onSubmit={create} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3"><legend className="mb-3">Elige un uso para empezar</legend>
            {(Object.keys(KIND) as Kind[]).map((value) => {
              const Icon = ICONS[DEFAULTS[value].icon];
              return <label key={value} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-md p-3 ${kind === value ? "bg-tint" : "bg-bg"}`}>
                <input type="radio" name="kind" value={value} checked={kind === value} className="mt-2 accent-accent"
                  onChange={() => { setKind(value); setIcon(DEFAULTS[value].icon); setTarget(DEFAULTS[value].target); }} />
                <Icon size={24} aria-hidden="true" className="mt-1 shrink-0" />
                <span><strong>{KIND[value]}</strong><span className="block text-ink-2">{DEFAULTS[value].purpose}</span>
                  <span className="block text-[length:var(--text-s)]">Lo que ve tu cliente: {DEFAULTS[value].customer.toLowerCase()}.</span></span>
              </label>;
            })}
          </fieldset>
          <label className="flex flex-col gap-2">Nombre del punto<input className={field} maxLength={60} required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Caja principal" /></label>
          <label className="flex flex-col gap-2">Ícono<select className={field} value={icon} onChange={(e) => setIcon(e.target.value as PointIcon)}>
            {(Object.keys(ICON_NAMES) as PointIcon[]).map((value) => <option key={value} value={value}>{ICON_NAMES[value]}</option>)}
          </select></label>
          <label className="flex flex-col gap-2">Qué abre<select className={field} value={target} onChange={(e) => setTarget(e.target.value as Target)}>
            <option value="profile">Página del negocio</option><option value="current">Cobro del momento</option><option value="assigned">Cobro asignado</option>
          </select></label>
          <Button variant="primary" disabled={busy || !label.trim()}>Crear punto</Button>
        </form>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader title="Cobrar en una mesa" />
        <ol aria-label="Cobrar en una mesa" className="list-decimal space-y-3 pl-6">
          <li>Crea el cobro en <a className="text-accent underline" href="#cobrar">Cobrar</a>.</li>
          <li>Selecciona la mesa y asigna el cobro a ese punto.</li>
          <li>El cliente acerca el celular al NFC o escanea el QR y paga.</li>
        </ol>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader title="Grabar en NFC" />
        <p className="text-ink-2">Usa NFC Tools de wakdev, en su versión gratuita.</p>
        <ol aria-label="Grabar en NFC" className="list-decimal space-y-3 pl-6">
          <li>Abre Escribir y añade un registro URL/URI.</li>
          <li>Pega el enlace de este punto y pulsa Escribir.</li>
          <li>Acerca una etiqueta NFC escribible al teléfono y prueba el enlace.</li>
        </ol>
        <p className="text-[length:var(--text-s)] text-ink-2">El teléfono y la etiqueta deben ser compatibles. Si no tienes NFC, usa el QR.</p>
        <a href={NFC_GUIDE} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-accent underline">Guía de NFC Tools</a>
      </section>
    </>}>
      <Surface className="flex min-w-0 flex-col gap-5">
        {selected ? <>
          <div data-point-print className="flex min-w-0 flex-col items-center gap-4 text-center">
            <div><p className="text-ink-2">{data.business.name}</p><h2 className="text-[length:var(--text-l)]">{selected.label}</h2></div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(data.business.demo_data || selected.demo_data) && <DataBadge />}
              <Chip tone={selected.active ? "neutral" : "bad"}>{selected.active ? KIND[selected.kind] : "Revocado"}</Chip>
            </div>
            {selected.active ? <div className="flex w-full justify-center rounded-lg bg-tint p-4 print:bg-transparent print:p-0"><PointQr value={url} label={selected.label} /></div> : <p>Este punto ya no está activo</p>}
            <p className="hidden break-all print:block">{url}</p>
          </div>
          {selected.active && <>
            <div className="flex flex-wrap gap-3"><Button size="sm" variant="secondary" onClick={print}><Printer size={20} aria-hidden="true" />Imprimir QR</Button>
              <Button size="sm" variant="secondary" onClick={() => void copy()}>Copiar URL</Button></div>
            <label className="flex min-w-0 flex-col gap-2">URL del punto<input readOnly className={field} value={url} onFocus={(e) => e.target.select()} /></label>
            {targetOf(selected) === "assigned" && <form className="flex flex-col gap-3 border-t border-line pt-5" onSubmit={(e) => {
              e.preventDefault(); void act(() => api(`/points/${selected.id}/orders`, { method: "POST", body: JSON.stringify({ order_id: orderId }) }), "Cobro asignado.");
            }}>
              <label className="flex flex-col gap-2">Cobro pendiente<select className={field} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Selecciona un cobro</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.concept} ({pesos(order.amount_cents)})</option>)}
              </select></label>
              <Button size="sm" variant="secondary" disabled={busy || !orderId}>Asignar cobro a este punto</Button>
              <p className="text-[length:var(--text-s)] text-ink-2">Si hay dos cobros, el cliente elige el suyo. No se selecciona una automáticamente.</p>
            </form>}
            <div className="border-t border-line pt-4"><Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => api(`/points/${selected.id}`, { method: "DELETE" }), "Este punto ya no está activo")}>Revocar punto</Button>
              <p className="text-[length:var(--text-s)] text-ink-2">Revocar detiene este enlace. No cancela cobros ya generados.</p></div>
          </>}
        </> : <div className="flex flex-col items-start gap-5"><QrCode size={64} className="text-accent" aria-hidden="true" />
          <h2 className="text-[length:var(--text-l)]">Crea tu primer punto</h2><p>Su QR abre la página del negocio o los cobros que asignes. La etiqueta NFC guarda el mismo enlace.</p>
          {data.business.demo_data && <DataBadge />}</div>}
      </Surface>
      {notice && <p role="status" className="rounded-md bg-tint p-4">{notice}</p>}
    </PageLayout>
  </>;
}

const readToken = () => window.location.hash.startsWith("#puntos/") ? window.location.hash.split("/")[1] || null : null;
export default function Puntos() {
  const [token, setToken] = useState(readToken);
  useEffect(() => { const sync = () => setToken(readToken()); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  return token ? <PublicPoint key={token} token={token} /> : <ManagePoints />;
}
