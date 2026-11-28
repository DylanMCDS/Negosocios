import { useEffect, useRef, useState } from "react";
import { Camera } from "@phosphor-icons/react";
import { ApiError, api } from "../../lib/api";
import { Button } from "../../lib/ui";
import { formatCents } from "./amount";

interface CouponView {
  token: string;
  status: "valid" | "used" | "expired";
  issuer: { id: string; name: string };
  redeem_at: { id: string; name: string };
  discount_pct: number;
}
interface Redeemed { applied: boolean; total_cents: number; discount_cents: number }
interface Detector { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }

const NO_CAMERA = "escribe o pega el código del cupón";
const estimate = (cents: number, pct: number) => cents - Math.floor((cents * Math.round(pct * 100)) / 10000);

/* The QR holds a link or the bare token: the last path segment is the token. */
export function tokenFrom(raw: string) {
  const text = raw.trim().split(/[?#]/)[0].replace(/\/+$/, "");
  return text.slice(text.lastIndexOf("/") + 1);
}

// The server's reasons, in the words the cashier sees.
function reason(error: unknown) {
  const detail = error instanceof ApiError ? error.detail ?? "" : "";
  if (/ya se usó/i.test(detail)) return "Este cupón ya se usó";
  if (/venci/i.test(detail)) return "Venció";
  if (/no vale/i.test(detail)) return "No vale en este negocio";
  if (/presupuesto/i.test(detail)) return "No hay presupuesto de la alianza";
  if (error instanceof ApiError && error.status === 404) return "No encontramos ese cupón";
  return detail || "No pudimos aplicar el cupón. Tu cobro sigue aquí.";
}

export default function CouponScanner({ businessId, amountCents, newKey, onApplied }: {
  businessId: string; amountCents: number; newKey: () => string; onApplied: (totalCents: number, coupon: { issuer: string; pct: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<CouponView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<{ getTracks: () => Array<{ stop: () => void }> } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stopCamera, []);

  async function lookup(raw: string) {
    const token = tokenFrom(raw);
    setError(null);
    setCoupon(null);
    if (!token) return;
    if (amountCents <= 0) { setError("Escribe primero el importe del cobro."); return; }
    setBusy(true);
    try {
      const found = await api<CouponView>(`/coupons/${encodeURIComponent(token)}`);
      if (found.status === "used") setError("Este cupón ya se usó");
      else if (found.status === "expired") setError("Venció");
      else if (found.redeem_at.id !== businessId) setError("No vale en este negocio");
      else setCoupon({ ...found, token });
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setOpen(true);
    setMessage(null);
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) { setMessage(`Este navegador no lee QR: ${NO_CAMERA}.`); return; }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.current = media;
      const el = video.current;
      if (!el) { stopCamera(); return; }
      el.srcObject = media;
      await el.play();
      const detector = new Ctor({ formats: ["qr_code"] });
      timer.current = setInterval(async () => {
        try {
          const hit = (await detector.detect(el))[0];
          if (hit?.rawValue) { stopCamera(); setCode(tokenFrom(hit.rawValue)); void lookup(hit.rawValue); }
        } catch { /* a frame without QR is not an error */ }
      }, 300);
    } catch {
      setMessage(`No pudimos abrir la cámara: ${NO_CAMERA}.`);
    }
  }

  async function apply() {
    if (!coupon) return;
    setBusy(true);
    setError(null);
    try {
      const key = newKey();
      const done = await api<Redeemed>(`/coupons/${encodeURIComponent(coupon.token)}/redeem`, {
        method: "POST",
        body: JSON.stringify({ business_id: businessId, order_id: key, amount_cents: amountCents }),
      });
      setApplied(done.total_cents);
      onApplied(done.total_cents, { issuer: coupon.issuer.name, pct: coupon.discount_pct });
      setOpen(false);
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  }

  if (applied !== null) return null; // the hero already shows the discounted total
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" size="sm" onClick={() => void start()} disabled={open}>
        <Camera size={20} aria-hidden="true" />
        Escanear cupón
      </Button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <video ref={video} playsInline muted className={stream.current ? "aspect-square w-full rounded-md bg-ink object-cover" : "hidden"} />
          {message && <p role="status" className="text-ink-2">{message}</p>}
          <label className="flex flex-col gap-2 text-ink-2">
            Código del cupón
            <input className="min-h-14 rounded-lg border border-line bg-white px-4 text-ink" value={code} autoCapitalize="none" onChange={(e) => { setCode(e.target.value); setCoupon(null); setError(null); }} />
          </label>
          <Button variant="secondary" size="sm" onClick={() => void lookup(code)} disabled={code.trim() === "" || busy}>Ver cupón</Button>
          {error && <p role="alert">{error}</p>}
          {coupon && (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{`Cupón de ${coupon.issuer.name}`}</p>
              <p className="text-ink-2">{`Descuento ${coupon.discount_pct} %`}</p>
              <p className="font-display text-[length:var(--text-l)]">{`Total ${formatCents(estimate(amountCents, coupon.discount_pct))}`}</p>
              <p className="text-[length:var(--text-s)] text-ink-2">El descuento se aplica al confirmar.</p>
              <Button variant="secondary" onClick={() => void apply()} disabled={busy}>Aplicar cupón</Button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setOpen(false); }}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
