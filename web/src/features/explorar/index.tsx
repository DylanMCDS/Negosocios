import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coffee, Flower, Leaf, MapPin, NavigationArrow, Star, Storefront, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { Button, Chip, PageHeader, PageLayout, Surface } from "../../lib/ui";
import type { Profile } from "../perfil/model";

// Demo tianguis (CDMX centro): where the map opens and the list is measured from until the person shares a location.
const DEMO_CENTER = { lat: 19.432, lng: -99.133 };
const RADIUS_KM = 5;
// An ally can be farther than the list radius: it is looked up once over the whole planet (the server has no maximum).
const EVERYWHERE_KM = 25000;
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

interface Hours { open: string; close: string }
interface NetworkProfile {
  business_id: string;
  name: string;
  category: string;
  zone: string;
  lat: number;
  lng: number;
  schedule: Record<string, Hours>;
  verified: boolean;
  verification_text: string | null;
  distance_km: number | null;
  open_now: boolean;
  demo_data: boolean;
}
interface Partner { partner_id: string; partner_name: string; discount_pct: number; demo: boolean }
interface AllianceRow extends Partner { status: string }
interface Reputation { rating: number | null; reviews_count: number; endorsements: number }

const DAYS: Array<[string, string]> = [["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"], ["thu", "Jueves"], ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"]];
const distance = (km: number | null) => (km === null ? "" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const pinHtml = (label: string, on: boolean) =>
  `<span style="display:grid;place-items:center;width:${on ? 40 : 32}px;height:${on ? 40 : 32}px;border-radius:9999px;` +
  `background:var(--accent);color:var(--accent-ink);font:500 16px var(--font-display, monospace);border:2px solid var(--surface)">${label}</span>`;

type LeafletMap = { attributionControl?: { setPosition: (position: "topright") => unknown }; remove: () => void; setView: (c: [number, number], z: number) => LeafletMap };
type LeafletApi = typeof import("leaflet");

/* Allies of one business: name, trade, zone and the discount of each alliance. Tapping one selects it. */
function PartnerList({ partners, items, onPick }: { partners: Partner[]; items: NetworkProfile[]; onPick: (id: string, target: HTMLElement) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col divide-y divide-hairline">
        {partners.map((p) => {
          const found = items.find((i) => i.business_id === p.partner_id);
          return (
            <li key={p.partner_id}>
              <button type="button" disabled={!found} onClick={(e) => onPick(p.partner_id, e.currentTarget)} className="flex min-h-14 w-full cursor-pointer flex-col justify-center py-2 text-left disabled:cursor-default">
                <span className="font-semibold">{p.partner_name}</span>
                {found && <span className="text-[length:var(--text-s)] text-ink-2">{found.category} · {found.zone}</span>}
                <span className="font-display text-money">{p.discount_pct} % de descuento</span>
              </button>
            </li>
          );
        })}
      </ul>
      {partners.some((p) => p.demo) && <p className="text-[length:var(--text-s)] text-ink-2">Datos de ejemplo</p>}
    </div>
  );
}

const coverIcons = { toldo: Storefront, maiz: Leaf, cafe: Coffee, flores: Flower };
const coverColors = { toldo: "bg-tint", maiz: "bg-warn", cafe: "bg-tint", flores: "bg-ok" };

function PreviewCard({ business, reputation, trigger, onClose, partners, items, onPick, onBack, startOpen }: {
  business: NetworkProfile; reputation: Reputation | null | undefined; trigger: HTMLElement | null; onClose: () => void;
  partners: Partner[]; items: NetworkProfile[]; onPick: (id: string, target: HTMLElement) => void; onBack: (() => void) | null; startOpen: boolean;
}) {
  const [network, setNetwork] = useState(startOpen);
  const [page, setPage] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    api<Profile>(`/profile/${encodeURIComponent(business.business_id)}`).then((profile) => {
      if (!alive) return;
      if (profile.business_id !== business.business_id) { setPhase("failed"); return; }
      setPage(profile); setPhase("ready");
    }, () => { if (alive) setPhase("failed"); });
    return () => { alive = false; };
  }, [business.business_id]);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger?.contains(event.target)) onClose(); };
    document.addEventListener("keydown", key);
    document.addEventListener("click", outside, true);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("click", outside, true); };
  }, [onClose, trigger]);
  const info = page ?? business;
  const rep = page?.reputation ?? reputation;
  const cover = page?.cover ?? "toldo";
  const Art = coverIcons[cover];
  return <div ref={panel} role="dialog" aria-label={`Vista previa de ${info.name}`} aria-busy={phase === "loading"}
    className="fixed inset-x-4 bottom-20 z-[1100] flex h-auto max-h-[55dvh] flex-col overflow-hidden rounded-lg bg-surface shadow-lift md:absolute md:inset-x-auto md:bottom-auto md:left-4 md:top-4 md:max-h-[calc(100%-32px)] md:w-96">
    <Button variant="ghost" size="sm" aria-label="Cerrar vista previa" className="absolute right-4 top-4 z-10 bg-surface" onClick={onClose}><X size={24} aria-hidden="true" /></Button>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-6">
      {network && partners.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="pr-10 font-display text-[length:var(--text-l)] leading-tight">{`Red de ${info.name}`}</h2>
          <PartnerList partners={partners} items={items} onPick={onPick} />
        </div>
      ) : <>
      <div className={`mb-3 flex h-14 items-center rounded-md px-4 ${coverColors[cover]}`}><Art size={48} className="text-accent" aria-hidden="true" /></div>
      <h2 className="pr-2 font-display text-[length:var(--text-l)] leading-tight">{info.name}</h2>
      <p className="mt-1 text-[length:var(--text-s)] text-ink-2">{info.category} · {info.zone}</p>
      <div className="mt-3 flex flex-col gap-2">
        <div><Chip size="sm" tone={info.open_now ? "ok" : "neutral"}>{info.open_now ? "Abierto ahora" : "Cerrado ahora"}</Chip></div>
        {phase === "loading" ? <div role="status" aria-label="Cargando perfil" className="flex h-20 flex-col gap-3 motion-safe:animate-pulse"><span className="h-5 w-3/4 rounded-md bg-tint" /><span className="h-10 rounded-md bg-tint" /><span className="sr-only">Cargando perfil…</span></div> : <div className="min-h-20">
          <p className="flex items-center gap-2"><Star size={20} aria-hidden="true" className="shrink-0 text-accent" />{rep && rep.rating !== null ? `${rep.rating.toFixed(1)} de 5 · ${rep.reviews_count} reseñas` : "Aún sin reseñas"}</p>
          {page?.promotions[0] && <div className="mt-2"><p>{page.promotions[0].title}</p><p className="font-display text-money">{page.promotions[0].discount_pct} % de descuento</p></div>}
          {phase === "failed" && <p role="status" className="mt-2 text-ink-2">No pudimos cargar el perfil</p>}
        </div>}
        <details className="text-[length:var(--text-s)] text-ink-2"><summary className="flex min-h-11 cursor-pointer items-center">Más información</summary>
          <p>{business.verified && business.verification_text ? `Verificado: ${business.verification_text}` : "Sin verificar"}</p>
          {rep && rep.endorsements > 0 && <p>{`Recomendado por ${rep.endorsements} ${rep.endorsements === 1 ? "aliado" : "aliados"}`}</p>}
          <ul>{DAYS.filter(([k]) => info.schedule[k]).map(([k, label]) => <li key={k}>{`${label} ${info.schedule[k]!.open} a ${info.schedule[k]!.close}`}</li>)}</ul>
        </details>
      </div>
      </>}
    </div>
    <div className="shrink-0 border-t border-hairline bg-surface px-4 pb-3">
        <div className="flex flex-wrap items-center gap-x-4">
          <a className="inline-flex min-h-11 items-center font-display text-[length:var(--text-l)] text-accent underline underline-offset-4" href={`#perfil/${encodeURIComponent(business.business_id)}`}>Ver negocio</a>
          {partners.length > 0 && <Button variant="secondary" size="sm" onClick={() => setNetwork(!network)}>{network ? "Ocultar alianzas" : "Ver alianzas"}</Button>}
          {onBack && <Button variant="ghost" size="sm" onClick={onBack}>Volver</Button>}
        </div>
        {info.demo_data && <p className="text-[length:var(--text-s)] text-ink-2">Datos de ejemplo</p>}
    </div>
  </div>;
}

export default function Explorar() {
  const [center, setCenter] = useState(DEMO_CENTER);
  const [items, setItems] = useState<NetworkProfile[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [allied, setAllied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [alliances, setAlliances] = useState<Record<string, Partner[]>>({});
  const lines = useRef<Array<{ remove: () => void }>>([]);
  // Every business seen so far, whatever the active filter: allies are resolved here, not from the filtered list.
  const [directory, setDirectory] = useState<Record<string, NetworkProfile>>({});
  const askedAll = useRef(false);
  // "#explorar/<id>" (from a public profile) opens that business with its network.
  const [fromProfile] = useState(() => decodeURIComponent(window.location.hash.slice(1).split("/")[1] ?? "") || null);
  const [reputation, setReputation] = useState<Record<string, Reputation | null>>({});
  const [failed, setFailed] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed" | "no-tiles">("loading");
  const [note, setNote] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ L: LeafletApi; map: LeafletMap } | null>(null);
  const markers = useRef<Array<{ remove: () => void }>>([]);
  const trigger = useRef<HTMLElement | null>(null);
  const closePreview = useCallback(() => {
    setSelected(null);
    setTrail([]);
    const target = trigger.current?.isConnected ? trigger.current : mapEl.current;
    target?.focus({ preventScroll: true });
  }, []);
  const selectBusiness = useCallback((id: string, target: HTMLElement | null) => {
    trigger.current = target;
    setSelected(id);
    if (window.matchMedia?.("(max-width: 767px)").matches) mapEl.current?.scrollIntoView?.({ block: "start" });
  }, []);

  useEffect(() => {
    let alive = true;
    const query = `/network?lat=${center.lat}&lng=${center.lng}&radius_km=${RADIUS_KM}` +
      (category ? `&category=${encodeURIComponent(category)}` : "") + (openNow ? "&open_now=true" : "");
    api<NetworkProfile[]>(query).then(
      (list) => {
        if (!alive) return;
        setFailed(false);
        setItems(list);
        if (!category && !openNow) setCategories([...new Set(list.map((p) => p.category))].sort());
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [center, category, openNow]);

  // Stars and ally endorsements are separate facts; a business without reviews (or a failed lookup) simply has none.
  useEffect(() => {
    for (const p of items ?? []) {
      if (p.business_id in reputation) continue;
      setReputation((r) => ({ ...r, [p.business_id]: null }));
      api<Reputation>(`/businesses/${encodeURIComponent(p.business_id)}/reputation`).then(
        (rep) => setReputation((r) => ({ ...r, [p.business_id]: rep })),
        () => undefined,
      );
    }
  }, [items, reputation]);

  useEffect(() => {
    if (items?.length) setDirectory((d) => ({ ...d, ...Object.fromEntries(items.map((p) => [p.business_id, p])) }));
  }, [items]);

  // Active alliances of the selected business; none (or a failed lookup) means no button and no lines.
  useEffect(() => {
    if (!selected || selected in alliances) return;
    api<AllianceRow[]>(`/alliances?business_id=${encodeURIComponent(selected)}`).then(
      (rows) => setAlliances((a) => ({ ...a, [selected]: rows.filter((r) => r.status === "active") })),
      () => setAlliances((a) => ({ ...a, [selected]: [] })),
    );
  }, [selected, alliances]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        const L = (mod.default ?? mod) as LeafletApi;
        if (cancelled || !mapEl.current) return;
        const map = L.map(mapEl.current, { zoomControl: true }).setView([DEMO_CENTER.lat, DEMO_CENTER.lng], 15) as unknown as LeafletMap;
        map.attributionControl?.setPosition("topright");
        (map as unknown as { zoomControl?: { setPosition?: (p: string) => void } }).zoomControl?.setPosition?.("bottomright");
        const tiles = L.tileLayer(TILES, { attribution: "© OpenStreetMap" });
        tiles.on("tileerror", () => setMapState((s) => (s === "ready" ? "no-tiles" : s)));
        tiles.addTo(map as never);
        mapRef.current = { L, map };
        setMapState("ready");
      } catch {
        if (!cancelled) setMapState("failed");
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.map.remove();
      mapRef.current = null;
    };
  }, []);

  const visible = useMemo(
    () => allied ? (items ?? []).filter((p) => (reputation[p.business_id]?.endorsements ?? 0) > 0) : (items ?? []),
    [items, allied, reputation],
  );


  useEffect(() => {
    if (!fromProfile) return;
    // Coming from a profile the page keeps its old scroll: start at the top (desktop) or at the map (phone), so the pins are in view.
    try { window.scrollTo?.(0, 0); } catch { /* not scrollable here */ }
    selectBusiness(fromProfile, null);
  }, [fromProfile, selectBusiness]);
  const partners = selected ? alliances[selected] ?? [] : [];
  const pool = useMemo(() => Object.values(directory), [directory]);
  // The selected business and its allies keep their pins even when a filter hides them from the list.
  const shown = useMemo(() => {
    const extra = new Set(selected ? [selected, ...partners.map((x) => x.partner_id)] : []);
    return [...visible, ...pool.filter((p) => extra.has(p.business_id) && !visible.some((v) => v.business_id === p.business_id))];
  }, [visible, pool, selected, partners]);
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref || mapState === "failed") return;
    markers.current.forEach((m) => m.remove());
    markers.current = shown.map((p) => {
      const icon = ref.L.divIcon({ html: pinHtml(p.category.charAt(0).toUpperCase(), false), className: "", iconSize: [40, 40] });
      const marker = ref.L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(ref.map as never);
      marker.on("click", () => selectBusiness(p.business_id, marker.getElement() ?? mapEl.current));
      return marker;
    });
    ref.map.setView([center.lat, center.lng], 15);
  }, [shown, mapState, center, selectBusiness]);
  // An ally hidden by the filter or the radius is looked up once without filters.
  useEffect(() => {
    if (askedAll.current || partners.every((x) => x.partner_id in directory)) return;
    askedAll.current = true;
    api<NetworkProfile[]>(`/network?lat=${center.lat}&lng=${center.lng}&radius_km=${EVERYWHERE_KM}`).then(
      (list) => setDirectory((d) => ({ ...Object.fromEntries(list.map((p) => [p.business_id, p])), ...d })),
      () => undefined,
    );
  }, [partners, directory, center]);
  const pickPartner = useCallback((id: string, target: HTMLElement) => {
    if (selected) setTrail((t) => [...t, selected]);
    selectBusiness(id, target);
  }, [selected, selectBusiness]);
  const goBack = useCallback(() => {
    const previous = trail[trail.length - 1];
    if (!previous) return;
    setTrail((t) => t.slice(0, -1));
    setSelected(previous);
  }, [trail]);

  // The network of the selected business, drawn as lines to its allies.
  useEffect(() => {
    const ref = mapRef.current;
    lines.current.forEach((l) => l.remove());
    lines.current = [];
    const from = pool.find((p) => p.business_id === selected);
    if (!ref || !from || !ref.L.polyline) return;
    // On wide screens the card covers the left of the map: keep the whole network visible to its right.
    const ids = [selected, ...partners.map((x) => x.partner_id)];
    const points = pool.filter((p) => ids.includes(p.business_id)).map((p) => [p.lat, p.lng] as [number, number]);
    if (points.length > 1) {
      const wide = window.matchMedia?.("(min-width: 768px)").matches;
      (ref.map as unknown as { fitBounds?: (b: unknown, o: unknown) => void }).fitBounds?.(points, { paddingTopLeft: [wide ? 420 : 40, 40], paddingBottomRight: [40, wide ? 40 : 300], maxZoom: 16 });
    }
    lines.current = partners.flatMap((partner) => {
      const to = pool.find((p) => p.business_id === partner.partner_id);
      if (!to) return [];
      return [ref.L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: "var(--accent)", weight: 3, dashArray: "6 6", className: "stroke-accent" }).addTo(ref.map as never)];
    });
  }, [selected, pool, alliances, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setNote(null);
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setNote("Sin permiso de ubicación: te mostramos el tianguis de ejemplo."),
    ) ?? setNote("Tu navegador no comparte la ubicación: te mostramos el tianguis de ejemplo.");

  const current = visible.find((p) => p.business_id === selected) ?? (selected ? directory[selected] ?? null : null);
  const pill = (on: boolean) =>
    `inline-flex h-11 cursor-pointer items-center rounded-full border px-4 font-display text-[length:var(--text-s)] ${on ? "border-ink bg-tint" : "border-line bg-surface"}`;

  return (
    <>
      <PageHeader title="Explorar" lead="Negocios cerca de ti que cobran con CoDi." />
      <PageLayout
        aside={
          <div className="flex flex-col gap-6">
            <Surface className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} className={pill(category === c)} onClick={() => setCategory(category === c ? null : c)}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-s)]">
                <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-accent" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />Abierto ahora</label>
                <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-accent" checked={allied} onChange={(e) => setAllied(e.target.checked)} />Con promoción de aliado</label>
              </div>
              <Button variant="secondary" size="sm" onClick={locate}><NavigationArrow size={20} aria-hidden="true" />Cerca de mí</Button>
              {note && <p className="text-ink-2">{note}</p>}
            </Surface>
            {failed && <p role="alert">No pudimos cargar los negocios. Intenta de nuevo.</p>}
            {items && visible.length === 0 && !failed && <p className="text-ink-2">No hay negocios con esos filtros.</p>}
            {current && partners.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="font-display text-[length:var(--text-l)]">Aliados de este negocio</h2>
                <PartnerList partners={partners} items={pool} onPick={pickPartner} />
              </section>
            )}
            <ul className="flex flex-col divide-y divide-hairline">
              {visible.map((p) => (
                <li key={p.business_id}>
                  <button type="button" onClick={(event) => selectBusiness(p.business_id, event.currentTarget)} aria-current={p.business_id === selected ? "true" : undefined} className="flex min-h-14 w-full cursor-pointer items-center gap-3 py-2 text-left">
                    <MapPin size={28} aria-hidden="true" />
                    <span className="flex-1"><span className="block font-semibold">{p.name}</span><span className="block text-[length:var(--text-s)] text-ink-2">{p.category} · {distance(p.distance_km)}</span></span>
                    <Chip size="sm" tone={p.open_now ? "ok" : "neutral"}>{p.open_now ? "Abierto" : "Cerrado"}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <div className="relative isolate flex flex-col gap-3">
          <div ref={mapEl} tabIndex={-1} className="h-[60dvh] min-h-96 w-full overflow-hidden rounded-lg border border-line bg-tint md:h-[calc(100dvh-300px)] md:min-h-96" aria-label="Mapa de negocios cercanos" />
          {current && <PreviewCard key={current.business_id} business={current} reputation={reputation[current.business_id]} trigger={trigger.current} onClose={closePreview}
            partners={partners} items={pool} onPick={pickPartner} onBack={trail.length ? goBack : null} startOpen={current.business_id === fromProfile} />}
          {mapState === "failed" && <p className="text-ink-2">El mapa no está disponible: usa la lista.</p>}
          {mapState === "no-tiles" && <p className="text-ink-2">No pudimos cargar el mapa: usa la lista.</p>}
        </div>
      </PageLayout>
    </>
  );
}
