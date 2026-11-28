import { useEffect, useMemo, useState } from "react";
import { QrCode } from "@phosphor-icons/react";
import QRCode from "qrcode";
import { api, ApiError } from "../../lib/api";
import { FadeIn } from "../../lib/motion/FadeIn";
import { Button, Chip, DataBadge, PageHeader, PageLayout, SectionHeader, SkeletonList, Surface } from "../../lib/ui";

export const COUPON_STORAGE_KEY = "negosocios.coupons";
export interface Coupon {
  token: string;
  alliance_id: string;
  status: "valid" | "used" | "expired";
  issuer: { id: string; name: string };
  redeem_at: { id: string; name: string };
  discount_pct: number;
  expires_at: string;
  demo_data: boolean;
}
interface Entry { token: string; coupon?: Coupon; error?: string }
const validToken = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 256;

export function savedCouponTokens(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? [...new Set(stored.filter(validToken))] : [];
  } catch {
    return [];
  }
}

export function saveCouponToken(token: string): boolean {
  if (!validToken(token)) return false;
  try {
    localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify([...new Set([...savedCouponTokens(), token])]));
    return true;
  } catch {
    return false;
  }
}

const LABEL = { valid: "Vigente", used: "Usado", expired: "Vencido" };
const when = (date: string) => new Date(date).toLocaleDateString("es-MX", {
  day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City",
});

function CouponQr({ coupon }: { coupon: Coupon }) {
  const { size, data } = useMemo(() => QRCode.create(coupon.token, { errorCorrectionLevel: "M" }).modules, [coupon.token]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return <svg viewBox={`-4 -4 ${size + 8} ${size + 8}`} role="img"
    aria-label={`QR para canjear en ${coupon.redeem_at.name}`} shapeRendering="crispEdges"
    className="aspect-square w-full max-w-[320px] bg-surface fill-ink">
    {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
  </svg>;
}

export default function Cupones() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const tokens = savedCouponTokens();
    void Promise.all(tokens.map(async (token): Promise<Entry> => {
      try { return { token, coupon: await api<Coupon>(`/coupons/${encodeURIComponent(token)}`) }; }
      catch (reason) {
        return { token, error: reason instanceof ApiError && reason.detail ? reason.detail : "No pudimos verificar este cupón. Revisa tu conexión." };
      }
    })).then((list) => {
      if (!alive) return;
      setEntries(list);
      setSelectedToken((old) => list.some((entry) => entry.token === old) ? old :
        (list.find((entry) => entry.coupon?.status === "valid") ?? list[0])?.token ?? "");
      setLoading(false);
    });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => {
    const refresh = () => setAttempt((n) => n + 1);
    const storage = (event: StorageEvent) => { if (event.key === COUPON_STORAGE_KEY) refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", storage); };
  }, []);
  const selected = entries.find((entry) => entry.token === selectedToken);
  const coupon = selected?.coupon;
  return <>
    <PageHeader title="Mis cupones" lead="Tus beneficios, listos para mostrar en el negocio aliado."
      action={<Button size="sm" variant="secondary" disabled={loading} onClick={() => setAttempt((n) => n + 1)}>Actualizar</Button>} />
    {loading && !entries.length ? <div className="py-8"><SkeletonList label="Verificando tus cupones" /></div> :
      !entries.length ? <div className="py-8"><Surface className="flex flex-col items-start gap-5">
        <QrCode size={64} aria-hidden="true" className="text-accent" />
        <h2 className="text-[length:var(--text-l)]">Aún no tienes cupones guardados.</h2>
        <p>Después de una compra verificada, guarda el beneficio que te ofrece un negocio aliado.</p>
        <a className="inline-flex min-h-11 items-center text-accent underline" href="#explorar">Explorar negocios</a>
      </Surface></div> :
      <PageLayout aside={<section className="flex flex-col gap-4">
        <SectionHeader title="Tus beneficios" />
        <ul aria-label="Tus cupones" className="divide-y divide-line">
          {entries.map((entry) => <li key={entry.token}>
            <button type="button" aria-pressed={selectedToken === entry.token} onClick={() => setSelectedToken(entry.token)}
              className={`flex min-h-14 w-full flex-col gap-3 rounded-md px-4 py-5 text-left ${selectedToken === entry.token ? "bg-tint" : ""}`}>
              {entry.coupon ? <>
                <span className="flex w-full items-start justify-between gap-3">
                  <strong className="text-[length:var(--text-l)]">{entry.coupon.redeem_at.name}</strong>
                  <Chip size="sm" tone={entry.coupon.status === "valid" ? "ok" : "neutral"}>{LABEL[entry.coupon.status]}</Chip>
                </span>
                <span className="font-display text-[length:var(--text-l)]">{entry.coupon.discount_pct}% de descuento</span>
                <span className="text-[length:var(--text-s)] text-ink-2">Vence el {when(entry.coupon.expires_at)}</span>
                {entry.coupon.demo_data && <DataBadge />}
              </> : <><strong>Cupón por verificar</strong><span role="alert" className="text-ink-2">{entry.error}</span></>}
            </button>
          </li>)}
        </ul>
      </section>}>
        <Surface className="flex flex-col items-center gap-5 text-center" >
          {coupon ? <FadeIn key={coupon.token} className="flex w-full flex-col items-center gap-5">
            <div>
              <p className="text-ink-2">Para tu próxima compra en</p>
              <h2 className="text-[length:var(--text-xl)]">{coupon.redeem_at.name}</h2>
            </div>
            <div>
              <p className="font-display text-[length:var(--text-2xl)] leading-none md:text-[length:var(--text-hero)]">{coupon.discount_pct}%</p>
              <p className="text-ink-2">de descuento</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Chip tone={coupon.status === "valid" ? "ok" : "neutral"}>{LABEL[coupon.status]}</Chip>
              {coupon.demo_data && <DataBadge />}
            </div>
            {coupon.status === "valid" ? <>
              <CouponQr coupon={coupon} />
              <p>Presenta este QR para que el negocio aplique tu beneficio.</p>
            </> : <p role="status">{coupon.status === "used" ? "Este cupón ya se usó." : "Este cupón venció."}</p>}
            <p className="text-[length:var(--text-s)] text-ink-2">Vence el {when(coupon.expires_at)}. Te lo dio {coupon.issuer.name}.</p>
          </FadeIn> : <div className="flex flex-col gap-4"><QrCode size={64} aria-hidden="true" className="self-center text-ink-2" />
            <h2 className="text-[length:var(--text-l)]">Verifica tu cupón</h2>
            <p>Actualiza para consultar su estado antes de mostrarlo en el negocio.</p></div>}
        </Surface>
      </PageLayout>}
    <p className="pb-8 text-[length:var(--text-s)] text-ink-2">Tus cupones viven en este navegador. Si borras sus datos, pierdes el acceso a ellos.</p>
  </>;
}
