import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapPin, Printer, QrCode } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { api } from "../../lib/api";
import { resolveActiveBusiness } from "../../lib/business";
import { Button, Chip, DataBadge, PageHeader, PageLayout, SectionHeader, Surface } from "../../lib/ui";
import "./print.css";

type Kind = "entrance" | "cashier" | "table";
interface Business { id: string; name: string; demo_data: boolean }
interface Point { id: string; kind: Kind; label: string; path: string; active: boolean; demo_data: boolean; pending_count: number }
interface PendingOrder { id: string; concept: string; amount_cents: number; url: string; demo_data?: boolean }
interface PointList { business: Business; points: Point[] }
interface Destination { point: Point; business: Business; mode: "profile" | "payment" | "choose" | "empty"; orders: PendingOrder[]; url: string }
const KIND: Record<Kind, string> = { entrance: "Entrada", cashier: "Caja", table: "Mesa" };
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
    className="aspect-square w-full max-w-[240px] fill-ink" shapeRendering="crispEdges">
    {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
  </svg>;
}

export function PublicPoint({ token }: { token: string }) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
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
  if (!destination) return <><PageHeader title="Abriendo punto" lead="Estamos buscando el puesto y sus cuentas." /><p role="status">Cargando…</p></>;
  const { business, orders, mode } = destination;
  return <>
    <PageHeader title={mode === "choose" ? "Elige tu cuenta" : mode === "profile" ? "Perfil del puesto" :
      mode === "empty" ? "No hay cuentas pendientes" : "Revisa tu cuenta"} lead="Confirma el receptor y el importe antes de pagar." />
    <Surface className="flex flex-col gap-6">
      <div><p className="text-ink-2">Pagas a</p><h2 className="text-[length:var(--text-l)]">{business.name}</h2></div>
      {(business.demo_data || orders.some((order) => order.demo_data)) && <div><DataBadge /></div>}
      {mode === "profile" && <a className="inline-flex min-h-14 items-center text-accent underline" href={destination.url}>Ver perfil</a>}
      {mode === "empty" && <p>Pide al comerciante que cree y asocie tu cuenta a este punto.</p>}
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
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async (id: string) => {
    const [list, pending] = await Promise.all([
      api<PointList>(`/points?business_id=${encodeURIComponent(id)}`),
      api<PendingOrder[]>(`/points/pending-orders?business_id=${encodeURIComponent(id)}`),
    ]);
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
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    window.addEventListener("afterprint", clearPrint);
    return () => { window.removeEventListener("afterprint", clearPrint); clearPrint(); };
  }, []);
  const selected = data?.points.find((p) => p.id === selectedId);
  const url = selected ? new URL(selected.path, window.location.origin).href : "";
  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true); setNotice("");
    try { await action(); await load(businessId); setNotice(message); }
    catch { setNotice("No se guardó el cambio. Revisa tu conexión e intenta de nuevo."); }
    finally { setBusy(false); }
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    void act(async () => {
      const point = await api<Point>("/points", { method: "POST", body: JSON.stringify({ business_id: businessId, kind, label }) });
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
    <PageLayout aside={<>
      <Surface className="flex flex-col gap-4">
        <SectionHeader title="Crear punto" />
        <form onSubmit={create} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">Tipo<select className={field} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="entrance">Entrada: perfil</option><option value="cashier">Caja: cobrar</option><option value="table">Mesa: cuenta</option>
          </select></label>
          <label className="flex flex-col gap-2">Nombre del punto<input className={field} maxLength={60} required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Caja principal" /></label>
          <Button variant={selected?.active ? "secondary" : "primary"} disabled={busy || !label.trim()}>Crear punto</Button>
        </form>
      </Surface>
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
            {selected.active ? <PointQr value={url} label={selected.label} /> : <p>Este punto ya no está activo</p>}
            <p className="hidden break-all print:block">{url}</p>
          </div>
          {selected.active && <>
            <div className="flex flex-wrap gap-3"><Button size="sm" onClick={print}><Printer size={20} aria-hidden="true" />Imprimir QR</Button>
              <Button size="sm" variant="secondary" onClick={() => void copy()}>Copiar URL</Button></div>
            <label className="flex min-w-0 flex-col gap-2">URL del punto<input readOnly className={field} value={url} onFocus={(e) => e.target.select()} /></label>
            {selected.kind !== "entrance" && <form className="flex flex-col gap-3 border-t border-line pt-5" onSubmit={(e) => {
              e.preventDefault(); void act(() => api(`/points/${selected.id}/orders`, { method: "POST", body: JSON.stringify({ order_id: orderId }) }), "Cuenta asociada.");
            }}>
              <label className="flex flex-col gap-2">Cuenta pendiente<select className={field} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Selecciona una cuenta</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.concept} ({pesos(order.amount_cents)})</option>)}
              </select></label>
              <Button size="sm" variant="secondary" disabled={busy || !orderId}>Asociar cuenta</Button>
              <p className="text-[length:var(--text-s)] text-ink-2">Si hay dos cuentas, el cliente elige la suya. No se selecciona una automáticamente.</p>
            </form>}
            <div className="border-t border-line pt-4"><Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => api(`/points/${selected.id}`, { method: "DELETE" }), "Este punto ya no está activo")}>Revocar punto</Button>
              <p className="text-[length:var(--text-s)] text-ink-2">Revocar detiene este enlace. No cancela cobros ya generados.</p></div>
          </>}
        </> : <div className="flex flex-col items-start gap-5"><QrCode size={64} className="text-accent" aria-hidden="true" />
          <h2 className="text-[length:var(--text-l)]">Crea tu primer punto</h2><p>Su QR abre el perfil del puesto o las cuentas que asocies. La etiqueta NFC guarda el mismo enlace.</p>
          {data.business.demo_data && <DataBadge />}</div>}
      </Surface>
      {notice && <p role="status" className="rounded-md bg-tint p-4">{notice}</p>}
      <section className="flex flex-col gap-3"><SectionHeader title="Puntos del puesto" />
        <ul className="divide-y divide-line">{data.points.map((point) => <li key={point.id}><button type="button"
          aria-pressed={selectedId === point.id} onClick={() => { setSelectedId(point.id); setNotice(""); }}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left">
          <span className="flex items-center gap-3"><MapPin size={24} aria-hidden="true" />{point.label}</span>
          <Chip size="sm" tone={point.active ? "neutral" : "bad"}>{point.active ? KIND[point.kind] : "Revocado"}</Chip>
        </button></li>)}</ul>
      </section>
    </PageLayout>
  </>;
}

const readToken = () => window.location.hash.startsWith("#puntos/") ? window.location.hash.split("/")[1] || null : null;
export default function Puntos() {
  const [token, setToken] = useState(readToken);
  useEffect(() => { const sync = () => setToken(readToken()); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  return token ? <PublicPoint key={token} token={token} /> : <ManagePoints />;
}
