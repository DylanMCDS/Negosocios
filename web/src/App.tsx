import { useEffect, useState, type ComponentType } from "react";
import { AppShell, PageHeader, Surface } from "./lib/ui";
import { buildMenu, MenuBar, type FeatureNav } from "./lib/ui/NavBar";
import { activeBusinessName, BUSINESS_CHANGED, validateSavedBusiness } from "./lib/business";
import Cobrar from "./lib/ui/locked/Cobrar";
import Pagar from "./lib/ui/locked/Pagar";
import Cierre from "./lib/ui/locked/Cierre";

// Each feature is web/src/features/<name>/index.tsx with `export default` (its screen) and nav.ts with `export const nav`
// (its menu entry). A new feature appears in the menu by adding those files: App.tsx does not change.
type FeatureModule = { default: ComponentType };
const modules = import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true });
const features: Record<string, ComponentType> = {};
for (const [path, mod] of Object.entries(modules)) features[path.split("/")[2]] = mod.default;
const menu = buildMenu(import.meta.glob<{ nav: FeatureNav }>("./features/*/nav.ts", { eager: true }));

function Soon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} lead="Esta pantalla llega pronto." />
      <div className="py-8"><Surface>Aquí va {title.toLowerCase()}.</Surface></div>
    </>
  );
}

// Screens that existed before their feature did (locked design); a feature's own index.tsx replaces them.
const fallbacks: Record<string, ComponentType> = { cobrar: Cobrar, pagar: Pagar, cierre: Cierre };
const views = menu.all;

// The view comes from the hash ("#cierre", "#pagar/<id>") or from a customer link ("/pagar/<id>").
const read = () => {
  if (/^\/pagar(\/|$)/.test(window.location.pathname)) return "pagar";
  return window.location.hash.slice(1).split("/")[0];
};

// The active business is always visible, desktop and phone, so the owner knows which puesto they are in.
function ActiveBusiness() {
  const [name, setName] = useState(activeBusinessName);
  useEffect(() => {
    void validateSavedBusiness();
    const sync = () => setName(activeBusinessName());
    window.addEventListener(BUSINESS_CHANGED, sync);
    return () => window.removeEventListener(BUSINESS_CHANGED, sync);
  }, []);
  return (
    <a href="#negocio" data-active-business className="mb-2 flex min-h-11 items-center justify-end text-[length:var(--text-s)] text-ink-2">
      Puesto: <span className="ml-1 font-display text-ink">{name}</span>
    </a>
  );
}

export default function App() {
  const [active, setActive] = useState(() => (views.some((v) => v.id === read()) ? read() : "cobrar"));
  useEffect(() => {
    const sync = () => views.some((v) => v.id === read()) && setActive(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const view = views.find((v) => v.id === active)!;
  const Screen = features[view.id] ?? fallbacks[view.id];
  return (
    <AppShell
      nav={
        <MenuBar
          menu={menu}
          active={active}
          onSelect={(id) => {
            window.location.hash = id;
            setActive(id);
          }}
        />
      }
    >
      {view.id !== "pagar" && view.id !== "negocio" && <ActiveBusiness />}
      {Screen ? <Screen /> : <Soon title={view.label} />}
    </AppShell>
  );
}
