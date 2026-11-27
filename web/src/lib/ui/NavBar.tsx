import type { ComponentType } from "react";

export type NavGroup = "inicio" | "negocio" | "clientes";
export interface FeatureNav {
  label: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>;
  order: number;
  group: NavGroup;
  hidden?: boolean;
}
export interface MenuEntry extends FeatureNav {
  id: string;
}
export interface Menu {
  /** Every feature with a nav.ts, hidden ones included: they stay routable. */
  all: MenuEntry[];
  inicio: MenuEntry[];
  negocio: MenuEntry[];
  clientes: MenuEntry[];
}

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

/** `modules` is the result of import.meta.glob("./features/*\/nav.ts"): the feature id is its folder name. */
export function buildMenu(modules: Record<string, { nav: FeatureNav }>): Menu {
  const all = Object.entries(modules)
    .map(([path, mod]) => ({ id: path.split("/").slice(-2, -1)[0], ...mod.nav }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const visible = all.filter((e) => !e.hidden);
  return {
    all,
    inicio: visible.filter((e) => e.group === "inicio"),
    negocio: visible.filter((e) => e.group === "negocio"),
    clientes: visible.filter((e) => e.group === "clientes"),
  };
}

const GROUPS: Array<{ key: "negocio" | "clientes"; label: string }> = [
  { key: "negocio", label: "Mi negocio" },
  { key: "clientes", label: "Clientes" },
];

type Props = { menu: Menu; active: string; onSelect: (id: string) => void };

/* MenuBar: top bar from 768 px, bottom bar below. Inicio first, then one group per audience (empty groups are not drawn).
   At 390 px the bottom bar scrolls sideways instead of overflowing the page. */
export function MenuBar({ menu, active, onSelect }: Props) {
  const groups = GROUPS.filter((g) => menu[g.key].length > 0);
  const button = (entry: MenuEntry, mobile: boolean) => {
    const Icon = entry.icon;
    const on = entry.id === active;
    return (
      <button
        key={entry.id}
        type="button"
        aria-current={on ? "page" : undefined}
        onClick={() => onSelect(entry.id)}
        className={
          mobile
            ? cx(
                "flex h-16 min-w-[76px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 font-display text-[length:var(--text-s)]",
                on ? "bg-accent text-accent-ink" : "text-ink",
              )
            : cx(
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-display text-[length:var(--text-s)]",
                on ? "bg-accent text-accent-ink" : "text-ink hover:bg-tint",
              )
        }
      >
        <Icon size={24} aria-hidden="true" />
        {entry.label}
      </button>
    );
  };
  return (
    <>
      <nav aria-label="Principal" className="sticky top-0 z-10 hidden border-b border-line bg-bg md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-8">
          <a href="#landing" className="font-display text-[length:var(--text-l)] text-accent">negosocios</a>
          <div className="flex items-center gap-3 rounded-full border border-line bg-surface p-1">
            {menu.inicio.map((e) => button(e, false))}
            {groups.map((g) => (
              <div key={g.key} role="group" aria-label={g.label} className="flex items-center gap-1 border-l border-hairline pl-3">
                <span aria-hidden="true" className="px-1 text-[length:var(--text-s)] text-ink-2">{g.label}</span>
                {menu[g.key].map((e) => button(e, false))}
              </div>
            ))}
          </div>
        </div>
      </nav>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface md:hidden">
        <div className="flex overflow-x-auto">
          {menu.inicio.map((e) => button(e, true))}
          {groups.map((g) => (
            <div key={g.key} role="group" aria-label={g.label} className="flex flex-1 border-l border-hairline">
              {menu[g.key].map((e) => button(e, true))}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
