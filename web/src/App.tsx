import { flushSync } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { applyMotionTokens, changeRoute, prefersReducedMotion } from "./lib/motion";
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

applyMotionTokens();

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
  // Scroll: a new screen starts at the top (smoothly); going back restores where the person was.
  const positions = useRef(new Map<string, number>());
  const current = useRef(active);
  const popped = useRef(false);
  useEffect(() => {
    const sync = () => {
      const next = read();
      if (views.some((v) => v.id === next) && next !== current.current) {
        positions.current.set(current.current, window.scrollY);
        current.current = next;
        changeRoute(() => flushSync(() => setActive(next)));
      }
    };
    const pop = () => (popped.current = true);
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const top = popped.current ? (positions.current.get(active) ?? 0) : 0;
    popped.current = false;
    window.scrollTo({ top, behavior: prefersReducedMotion() || top ? "auto" : "smooth" });
    if (!top || !box.current || typeof ResizeObserver === "undefined") return;
    // Going back: the data may arrive after the first paint and the page is still short; keep restoring while it grows, until the person scrolls.
    const stop = () => {
      observer.disconnect();
      clearTimeout(timer);
      for (const e of ["wheel", "touchstart", "keydown"]) window.removeEventListener(e, stop);
    };
    const observer = new ResizeObserver(() => window.scrollTo({ top, behavior: "auto" }));
    observer.observe(box.current);
    const timer = setTimeout(stop, 2000);
    for (const e of ["wheel", "touchstart", "keydown"]) window.addEventListener(e, stop, { passive: true });
    return stop;
  }, [active]);
  const view = views.find((v) => v.id === active)!;
  const Screen = features[view.id] ?? fallbacks[view.id];
  return (
    <AppShell
      nav={
        <MenuBar
          menu={menu}
          active={active}
          onSelect={(id) => {
            window.location.hash = id; // hashchange does the transition
          }}
        />
      }
    >
      {view.id !== "pagar" && view.id !== "negocio" && <ActiveBusiness />}
      <div key={active} ref={box} className="motion-route">
        {Screen ? <Screen /> : <Soon title={view.label} />}
      </div>
    </AppShell>
  );
}
