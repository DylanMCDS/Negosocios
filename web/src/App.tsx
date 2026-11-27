import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Microphone, QrCode, Receipt, Storefront, Wallet, House } from "@phosphor-icons/react";
import { AppShell, NavBar, PageHeader, Surface, type NavItem } from "./lib/ui";
import Cobrar from "./lib/ui/locked/Cobrar";
import Pagar from "./lib/ui/locked/Pagar";
import Cierre from "./lib/ui/locked/Cierre";

// Each feature is web/src/features/<name>/index.tsx with `export default`. It replaces the locked screen of the same id.
type FeatureModule = { default: ComponentType };
const modules = import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true });
const features: Record<string, ComponentType> = {};
for (const [path, mod] of Object.entries(modules)) features[path.split("/")[2]] = mod.default;

function Soon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} lead="Esta pantalla llega pronto." />
      <div className="py-8"><Surface>Aquí va {title.toLowerCase()}.</Surface></div>
    </>
  );
}

const icon = (el: ReactNode) => el;
const views: Array<NavItem & { fallback: ComponentType }> = [
  { id: "cobrar", label: "Cobrar", icon: icon(<QrCode size={24} aria-hidden="true" />), fallback: Cobrar },
  { id: "pagar", label: "Pagar", icon: icon(<Wallet size={24} aria-hidden="true" />), fallback: Pagar },
  { id: "cierre", label: "Cierre", icon: icon(<Receipt size={24} aria-hidden="true" />), fallback: Cierre },
  { id: "negocio", label: "Negocio", icon: icon(<Storefront size={24} aria-hidden="true" />), fallback: () => <Soon title="Mi negocio" /> },
  { id: "voz", label: "Voz", icon: icon(<Microphone size={24} aria-hidden="true" />), fallback: () => <Soon title="Gastos por voz" /> },
  { id: "landing", label: "Inicio", icon: icon(<House size={24} aria-hidden="true" />), fallback: () => <Soon title="Negosocios" /> },
];

const read = () => window.location.hash.slice(1);

export default function App() {
  const [active, setActive] = useState(() => (views.some((v) => v.id === read()) ? read() : "cobrar"));
  useEffect(() => {
    const sync = () => views.some((v) => v.id === read()) && setActive(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const view = views.find((v) => v.id === active)!;
  const Screen = features[view.id] ?? view.fallback;
  return (
    <AppShell
      nav={
        <NavBar
          items={views}
          active={active}
          onSelect={(id) => {
            window.location.hash = id;
            setActive(id);
          }}
        />
      }
    >
      <Screen />
    </AppShell>
  );
}
