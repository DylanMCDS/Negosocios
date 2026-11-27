import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { MapPin, Printer } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { Business } from "../../lib/types";
import { Button, Chip, PageHeader, PageLayout, Surface } from "../../lib/ui";
import { getBusinessId, saveBusinessId } from "./businessId";

const field =
  "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] font-display";

const publicId = () => new URLSearchParams(window.location.search).get("negocio");
const profileUrl = (id: string) => `${window.location.origin}/?negocio=${encodeURIComponent(id)}#negocio`;

function FixedQr({ value }: { value: string }) {
  const { size, data } = useMemo(() => QRCode.create(value, { errorCorrectionLevel: "M" }).modules, [value]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="QR fijo del puesto"
      className="aspect-square w-full max-w-[420px] fill-ink"
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

function AltaForm({ onCreated }: { onCreated: (b: Business) => void }) {
  const [values, setValues] = useState({ name: "", category: "", zone: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const complete = Object.values(values).every((v) => v.trim() !== "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent || !complete || saving) return;
    setSaving(true);
    setError(false);
    try {
      const created = await api<Business>("/businesses", {
        method: "POST",
        body: JSON.stringify({ name: values.name.trim(), category: values.category.trim(), zone: values.zone.trim() }),
      });
      saveBusinessId(created.id);
      onCreated(created);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const labeled = (id: keyof typeof values, label: string) => (
    <label className="flex flex-col gap-1 text-[length:var(--text-s)] text-ink-2">
      {label}
      <input className={field} value={values[id]} onChange={set(id)} />
    </label>
  );

  return (
    <Surface className="flex max-w-xl flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {labeled("name", "Nombre del puesto")}
        {labeled("category", "Giro")}
        {labeled("zone", "Zona")}
        <label className="flex items-start gap-3 text-[length:var(--text-body)]">
          <input type="checkbox" className="mt-1 size-6 accent-accent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Acepto que el nombre, giro y zona de mi puesto aparezcan en un perfil público.</span>
        </label>
        <Button type="submit" disabled={!consent || !complete || saving}>Guardar</Button>
      </form>
      {error && <p role="alert">No pudimos guardar tu puesto. Intenta de nuevo.</p>}
    </Surface>
  );
}

function Perfil({ business, owner }: { business: Business; owner: boolean }) {
  return (
    <PageLayout
      aside={
        <Surface className="flex flex-col gap-4">
          <p className="font-display text-[length:var(--text-l)]">Paga aquí con CoDi</p>
          <p className="text-ink-2">Abre tu app del banco, elige CoDi y escanea el QR del puesto.</p>
        </Surface>
      }
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[length:var(--text-xl)]">{business.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm">{business.category}</Chip>
          <span className="flex items-center gap-1 text-ink-2"><MapPin size={20} aria-hidden="true" />{business.zone}</span>
        </div>
        {business.temporary_location && <p className="text-ink-2">Hoy: {business.temporary_location}</p>}
      </div>
      {owner && (
        <div className="flex flex-col items-start gap-4 rounded-lg bg-tint p-6">
          <FixedQr value={profileUrl(business.id)} />
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={20} aria-hidden="true" />
            Imprimir
          </Button>
        </div>
      )}
    </PageLayout>
  );
}

export default function Negocio() {
  const viewId = publicId();
  const ownId = getBusinessId();
  const [business, setBusiness] = useState<Business | null>(null);
  const [failed, setFailed] = useState(false);
  const lookup = viewId ?? ownId;

  useEffect(() => {
    if (lookup) api<Business>(`/businesses/${encodeURIComponent(lookup)}`).then(setBusiness, () => setFailed(true));
  }, [lookup]);

  const title = business ? "Mi puesto" : "Alta de tu puesto";
  return (
    <>
      <PageHeader title={viewId ? "Perfil del puesto" : title} lead={business ? undefined : "Tres datos y listo."} />
      {failed && <p role="alert">No encontramos ese puesto.</p>}
      {business ? (
        <Perfil business={business} owner={!viewId && business.id === ownId} />
      ) : (
        !lookup && <AltaForm onCreated={setBusiness} />
      )}
    </>
  );
}
