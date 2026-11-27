import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, NavigationArrow } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { Button, Chip, PageHeader, PageLayout, SectionHeader, Surface } from "../../lib/ui";

// Demo tianguis (CDMX centro): where the map opens and the list is measured from until the person shares a location.
const DEMO_CENTER = { lat: 19.432, lng: -99.133 };
const RADIUS_KM = 5;
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
interface Reputation { rating: number | null; reviews_count: number; endorsements: number }

const DAYS: Array<[string, string]> = [["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"], ["thu", "Jueves"], ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"]];
const distance = (km: number | null) => (km === null ? "" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const pinHtml = (label: string, on: boolean) =>
  `<span style="display:grid;place-items:center;width:${on ? 40 : 32}px;height:${on ? 40 : 32}px;border-radius:9999px;` +
  `background:var(--accent);color:var(--accent-ink);font:500 16px var(--font-display, monospace);border:2px solid var(--surface)">${label}</span>`;

type LeafletMap = { remove: () => void; setView: (c: [number, number], z: number) => LeafletMap };
type LeafletApi = typeof import("leaflet");

export default function Explorar() {
  const [center, setCenter] = useState(DEMO_CENTER);
  const [items, setItems] = useState<NetworkProfile[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [allied, setAllied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reputation, setReputation] = useState<Record<string, Reputation | null>>({});
  const [failed, setFailed] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "ready" | "failed" | "no-tiles">("loading");
  const [note, setNote] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ L: LeafletApi; map: LeafletMap } | null>(null);
  const markers = useRef<Array<{ remove: () => void }>>([]);

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
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        const L = (mod.default ?? mod) as LeafletApi;
        if (cancelled || !mapEl.current) return;
        const map = L.map(mapEl.current, { zoomControl: true }).setView([DEMO_CENTER.lat, DEMO_CENTER.lng], 15) as unknown as LeafletMap;
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
    () => (items ?? []).filter((p) => !allied || (reputation[p.business_id]?.endorsements ?? 0) > 0),
    [items, allied, reputation],
  );

  useEffect(() => {
    const ref = mapRef.current;
    if (!ref || mapState === "failed") return;
    markers.current.forEach((m) => m.remove());
    markers.current = visible.map((p) => {
      const icon = ref.L.divIcon({ html: pinHtml(p.category.charAt(0).toUpperCase(), p.business_id === selected), className: "", iconSize: [40, 40] });
      const marker = ref.L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(ref.map as never);
      marker.on("click", () => setSelected(p.business_id));
      return marker;
    });
    ref.map.setView([center.lat, center.lng], 15);
  }, [visible, selected, mapState, center]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setNote(null);
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setNote("Sin permiso de ubicación: te mostramos el tianguis de ejemplo."),
    ) ?? setNote("Tu navegador no comparte la ubicación: te mostramos el tianguis de ejemplo.");

  const current = visible.find((p) => p.business_id === selected) ?? null;
  const rep = current ? reputation[current.business_id] : null;
  const pill = (on: boolean) =>
    `inline-flex h-11 cursor-pointer items-center rounded-full border px-4 font-display text-[length:var(--text-s)] ${on ? "border-ink bg-tint" : "border-line bg-surface"}`;

  return (
    <>
      <PageHeader title="Explorar" lead="Negocios cerca de ti que cobran con CoDi." />
      <PageLayout
        aside={
          <div className="flex flex-col gap-6">
            <Surface className="flex flex-col gap-4">
              <SectionHeader title="Filtros" size="sm" />
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} className={pill(category === c)} onClick={() => setCategory(category === c ? null : c)}>
                    {c}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-accent" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />Abierto ahora</label>
              <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-accent" checked={allied} onChange={(e) => setAllied(e.target.checked)} />Con promoción de aliado</label>
              <Button variant="secondary" size="sm" onClick={locate}><NavigationArrow size={20} aria-hidden="true" />Cerca de mí</Button>
              {note && <p className="text-ink-2">{note}</p>}
            </Surface>
            {failed && <p role="alert">No pudimos cargar los negocios. Intenta de nuevo.</p>}
            {items && visible.length === 0 && !failed && <p className="text-ink-2">No hay negocios con esos filtros.</p>}
            <ul className="flex flex-col divide-y divide-hairline">
              {visible.map((p) => (
                <li key={p.business_id}>
                  <button type="button" onClick={() => setSelected(p.business_id)} aria-current={p.business_id === selected ? "true" : undefined} className="flex min-h-14 w-full cursor-pointer items-center gap-3 py-2 text-left">
                    <MapPin size={28} aria-hidden="true" />
                    <span className="flex-1"><span className="block font-semibold">{p.name}</span><span className="block text-[length:var(--text-s)] text-ink-2">{p.category} · {distance(p.distance_km)}</span></span>
                    <Chip size="sm" tone={p.open_now ? "ok" : "neutral"}>{p.open_now ? "Abierto" : "Cerrado"}</Chip>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <Surface className="flex flex-col gap-3">
                <h2 className="font-display text-[length:var(--text-l)]">{current.name}</h2>
                <p className="text-ink-2">{current.category} · {current.zone}</p>
                <p>{current.verified && current.verification_text ? `Verificado: ${current.verification_text}` : "Sin verificar"}</p>
                <p>{rep && rep.rating !== null ? `${rep.rating.toFixed(1)} de 5 · ${rep.reviews_count} reseñas` : "Aún sin reseñas"}</p>
                {rep && rep.endorsements > 0 && <p>{`Recomendado por ${rep.endorsements} ${rep.endorsements === 1 ? "aliado" : "aliados"}`}</p>}
                <ul>{DAYS.filter(([k]) => current.schedule[k]).map(([k, label]) => <li key={k}>{`${label} ${current.schedule[k].open} a ${current.schedule[k].close}`}</li>)}</ul>
                <a className="font-display text-[length:var(--text-l)] underline decoration-accent underline-offset-4" href={`/?negocio=${encodeURIComponent(current.business_id)}#negocio`}>Paga aquí con CoDi</a>
                {current.demo_data && <p className="text-[length:var(--text-s)] text-ink-2">Datos de ejemplo</p>}
              </Surface>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div ref={mapEl} className="min-h-[420px] w-full overflow-hidden rounded-lg border border-line bg-tint" aria-label="Mapa de negocios cercanos" />
          {mapState === "failed" && <p className="text-ink-2">El mapa no está disponible: usa la lista.</p>}
          {mapState === "no-tiles" && <p className="text-ink-2">No pudimos cargar el mapa: usa la lista.</p>}
        </div>
      </PageLayout>
    </>
  );
}
