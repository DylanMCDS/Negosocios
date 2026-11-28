import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, Plus, Trash } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { BUSINESS_CHANGED, DEMO_BUSINESS_ID, getBusinessId } from "../../lib/business";
import { Button, PageHeader, Surface } from "../../lib/ui";
import ProfileView from "../perfil/ProfileView";
import { covers, days, editable, profileHash, type EditableProfile, type Profile } from "../perfil/model";

const field = "min-h-14 w-full rounded-md border border-line bg-surface px-4 text-ink";
type Draft = Omit<EditableProfile, "menu"> & { menu: Array<{ name: string; price: string; featured: boolean }> };
const draftOf = (p: Profile): Draft => ({ ...editable(p), menu: p.menu.map((item) => ({ name: item.name, price: (item.price_cents / 100).toFixed(2), featured: item.featured })) });
const bodyOf = (d: Draft): EditableProfile => ({ ...d, whatsapp: d.whatsapp?.trim() || null, menu: d.menu.map((item) => ({ name: item.name.trim(), price_cents: Math.round(Number(item.price.replace(",", ".")) * 100), featured: item.featured })) });

export default function MiPagina() {
  const [id, setId] = useState(() => getBusinessId() ?? DEMO_BUSINESS_ID);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(false);
  const [phase, setPhase] = useState<"loading" | "idle" | "saving" | "saved" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const changed = () => setId(getBusinessId() ?? DEMO_BUSINESS_ID);
    window.addEventListener(BUSINESS_CHANGED, changed);
    return () => window.removeEventListener(BUSINESS_CHANGED, changed);
  }, []);
  useEffect(() => {
    let current = true;
    generation.current += 1;
    setPhase("loading"); setProfile(null); setDraft(null);
    api<Profile>(`/profile/${encodeURIComponent(id)}`).then((p) => {
      if (current) { setProfile(p); setDraft(draftOf(p)); setPhase("idle"); }
    }, () => { if (current) setPhase("failed"); });
    return () => { current = false; generation.current += 1; };
  }, [id, retry]);
  const body = draft ? bodyOf(draft) : null;
  const valid = draft && body && draft.description.length <= 300 &&
    (!draft.whatsapp || /^\d{10,15}$/.test(draft.whatsapp)) &&
    draft.menu.every((item, i) => item.name.trim().length > 0 && item.price.trim() !== "" &&
      /^\d+(?:[.,]\d{0,2})?$/.test(item.price) && Number.isSafeInteger(body.menu[i].price_cents) && body.menu[i].price_cents >= 0 && body.menu[i].price_cents <= 100000000);
  function change(patch: Partial<Draft>) { setDraft((d) => d ? { ...d, ...patch } : d); if (phase === "saved" || phase === "failed") setPhase("idle"); }
  function menuItem(index: number, patch: Partial<Draft["menu"][number]>) {
    if (draft) change({ menu: draft.menu.map((item, i) => i === index ? { ...item, ...patch } : item) });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid || !body) return;
    setPhase("saving");
    const savingGeneration = generation.current;
    try {
      const saved = await api<Profile>(`/profile/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
      if (generation.current !== savingGeneration) return;
      setProfile(saved); setDraft(draftOf(saved)); setPhase("saved");
    } catch { if (generation.current === savingGeneration) setPhase("failed"); }
  }
  return <>
    <PageHeader title="Mi página" lead="Así conocerán tu puesto. Personalízalo y revisa cómo se ve." action={profile && <a href={profileHash(id)} className="inline-flex min-h-11 items-center gap-2 font-display text-accent underline"><Eye size={24} aria-hidden="true" />Ver mi página</a>} />
    {!profile || !draft || !body ? <div className="py-8"><Surface>{phase === "failed" ? <div className="flex flex-col items-start gap-4"><p role="alert">No pudimos cargar tu página.</p><Button onClick={() => setRetry((n) => n + 1)}>Reintentar</Button></div> : <div role="status"><div className="mb-4 h-32 rounded-lg bg-tint motion-safe:animate-pulse" />Cargando tu página…</div>}</Surface></div> : <>
      <div className="mt-6 lg:hidden"><Button variant="secondary" onClick={() => setPreview(!preview)}>{preview ? "Seguir editando" : "Vista previa"}</Button></div>
      <div className="grid items-start gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Surface className={preview ? "hidden lg:block" : ""}>
          <form onSubmit={save} className="flex flex-col gap-6">
            <div role="group" aria-label="Secciones de tu página" className="flex flex-wrap gap-2">
              {["Información", "Menú", "Horario"].map((label, i) => <Button key={label} type="button" variant={step === i ? "secondary" : "ghost"} size="sm" onClick={() => setStep(i)} aria-pressed={step === i}>{label}</Button>)}
            </div>
            <fieldset disabled={phase === "saving"} className="flex min-w-0 flex-col gap-4">
              <legend className="mb-4 font-display text-[length:var(--text-l)]">{["Presenta tu puesto", "¿Qué vendes?", "¿Cuándo abres?"][step]}</legend>
              {step === 0 && <>
                <label className="flex flex-col gap-2">Descripción corta<textarea className={`${field} min-h-28 py-3`} maxLength={300} value={draft.description} onChange={(e) => change({ description: e.target.value })} placeholder="Ej. Tortillas recién hechas y salsas de la casa." /></label>
                <label className="flex flex-col gap-2">Portada<select className={field} value={draft.cover} onChange={(e) => change({ cover: e.target.value as Draft["cover"] })}>{covers.map((cover) => <option key={cover.id} value={cover.id}>{cover.label}</option>)}</select></label>
                <label className="flex flex-col gap-2">WhatsApp (opcional)<input className={field} type="tel" inputMode="tel" maxLength={15} value={draft.whatsapp ?? ""} onChange={(e) => change({ whatsapp: e.target.value })} placeholder="Ej. 525512345678" /><span className="text-[length:var(--text-s)] text-ink-2">Incluye el código de país, sólo números. Déjalo vacío si no quieres publicarlo.</span></label>
              </>}
              {step === 1 && <>
                <p className="text-ink-2">Publica hasta 20 productos. Los precios están en pesos mexicanos.</p>
                {draft.menu.length === 0 && <p>Tu menú está vacío. Agrega tu primer producto.</p>}
                <ol className="divide-y divide-hairline">{draft.menu.map((item, i) => <li key={i} className="flex flex-col gap-3 py-4">
                  <label className="flex flex-col gap-2">Producto {i + 1}<input className={field} value={item.name} maxLength={80} onChange={(e) => menuItem(i, { name: e.target.value })} placeholder="Ej. Orden de tacos" /></label>
                  <label className="flex flex-col gap-2">Precio {i + 1} (MXN)<input className={field} inputMode="decimal" value={item.price} onChange={(e) => menuItem(i, { price: e.target.value })} placeholder="Ej. 65.50" /></label>
                  <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-accent" checked={item.featured} onChange={(e) => menuItem(i, { featured: e.target.checked })} />Destacar producto {i + 1}</label><Button type="button" variant="ghost" size="sm" aria-label={`Eliminar producto ${i + 1}`} onClick={() => change({ menu: draft.menu.filter((_, n) => n !== i) })}><Trash size={20} aria-hidden="true" />Eliminar</Button></div>
                </li>)}</ol>
                <Button type="button" variant="secondary" disabled={draft.menu.length >= 20} onClick={() => change({ menu: [...draft.menu, { name: "", price: "", featured: false }] })}><Plus size={24} aria-hidden="true" />Agregar producto</Button>
              </>}
              {step === 2 && <>
                <p className="text-ink-2">Hora de Ciudad de México. Si cierras después de medianoche, usa la hora del día siguiente.</p>
                {days.map(([key, label]) => <div className="flex flex-col gap-2 border-b border-hairline py-3" key={key}>
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-accent" checked={!!draft.schedule[key]} onChange={(e) => change({ schedule: { ...draft.schedule, [key]: e.target.checked ? { open: "09:00", close: "18:00" } : null } })} />{label}</label>
                  {draft.schedule[key] && <div className="grid grid-cols-2 gap-3">{(["open", "close"] as const).map((part) => <label key={part} className="flex min-w-0 flex-col gap-1"><span>{part === "open" ? "Abre" : "Cierra"}</span><input aria-label={`${label} ${part === "open" ? "abre" : "cierra"}`} className={`${field} min-w-0`} type="time" required value={draft.schedule[key]![part]} onChange={(e) => change({ schedule: { ...draft.schedule, [key]: { ...draft.schedule[key]!, [part]: e.target.value } } })} /></label>)}</div>}
                </div>)}
              </>}
            </fieldset>
            {!valid && <p role="status" className="text-ink-2">Revisa los nombres, precios y el número de WhatsApp antes de guardar.</p>}
            <div className="bg-surface py-3"><Button type="submit" disabled={!valid || phase === "saving"}>{phase === "saving" ? "Guardando…" : "Guardar página"}</Button></div>
            {phase === "saved" && <p role="status">Página guardada.</p>}
            {phase === "failed" && <p role="alert">No pudimos guardar. Tus cambios siguen aquí; intenta de nuevo.</p>}
          </form>
        </Surface>
        <aside className={preview ? "min-w-0" : "hidden min-w-0 lg:block"} aria-label="Vista previa de tu página"><h2 className="mb-4 font-display text-[length:var(--text-l)]">Vista previa</h2><ProfileView preview profile={{ ...profile, ...body }} /></aside>
      </div>
    </>}
  </>;
}
