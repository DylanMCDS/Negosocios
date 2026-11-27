import { useEffect, useState, type ComponentType } from "react";
import { DotsThree } from "@phosphor-icons/react";

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
   At 390 px the bottom bar has 5 entries: Inicio, Cierre, Cobrar (centre, highlighted), Explorar and Más, which opens the rest. */
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
                "flex h-16 min-w-[60px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 font-display text-[0.875rem]",
                on ? "bg-tint text-accent" : "text-ink-2",
              )
            : cx(
                "inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-display text-[length:var(--text-s)]",
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
      <nav aria-label="Principal" className="sticky top-0 z-10 hidden border-b border-hairline bg-bg md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-8">
          <a href="#landing" className="shrink-0 font-display text-[length:var(--text-l)] text-accent">negosocios</a>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-surface p-1 shadow-lift">
            {menu.inicio.map((e) => button(e, false))}
            {groups.map((g) => (
              <div key={g.key} role="group" aria-label={g.label} className="flex shrink-0 items-center gap-1 border-l border-hairline pl-1">
                {menu[g.key].map((e) => button(e, false))}
              </div>
            ))}
          </div>
        </div>
      </nav>
      <MobileBar menu={menu} active={active} onSelect={onSelect} />
    </>
  );
}

const MAIN_IDS = ["cierre", "cobrar", "explorar"];

function MobileBar({ menu, active, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const visible = [...menu.inicio, ...menu.negocio, ...menu.clientes];
  const home = menu.inicio[0];
  const main = MAIN_IDS.map((id) => visible.find((e) => e.id === id));
  const more = visible.filter((e) => e !== home && !MAIN_IDS.includes(e.id));
  const moreActive = more.some((e) => e.id === active);
  useEffect(() => setOpen(false), [active]);
  const cell = (entry: MenuEntry | undefined) => {
    if (!entry) return null;
    const Icon = entry.icon;
    const on = entry.id === active;
    const hero = entry.id === "cobrar";
    return (
      <button
        key={entry.id}
        type="button"
        aria-current={on ? "page" : undefined}
        onClick={() => onSelect(entry.id)}
        className={cx(
          "flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 font-display text-[0.875rem]",
          hero ? "text-accent" : on ? "bg-tint text-accent" : "text-ink-2",
        )}
      >
        {hero ? (
          <span className={cx("mt-1 grid size-9 place-items-center rounded-full", on ? "bg-tint text-accent ring-2 ring-accent" : "bg-accent text-accent-ink")}>
            <Icon size={24} aria-hidden="true" />
          </span>
        ) : (
          <Icon size={24} aria-hidden="true" />
        )}
        {entry.label}
      </button>
    );
  };
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface shadow-bar md:hidden">
      {open && (
        <div role="dialog" aria-label="Más opciones" className="absolute inset-x-0 bottom-full border-t border-hairline bg-surface p-3 shadow-bar">
          <ul className="grid grid-cols-2 gap-2">
            {more.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-current={e.id === active ? "page" : undefined}
                    onClick={() => onSelect(e.id)}
                    className={cx(
                      "flex h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-4 font-display text-[length:var(--text-body)]",
                      e.id === active ? "bg-tint text-accent" : "bg-bg text-ink",
                    )}
                  >
                    <Icon size={24} aria-hidden="true" />
                    {e.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-5">
        {cell(home)}
        {cell(main[0])}
        {cell(main[1])}
        {cell(main[2])}
        <button
          type="button"
          aria-expanded={open}
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setOpen((o) => !o)}
          className={cx("flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 font-display text-[0.875rem]", moreActive || open ? "bg-tint text-accent" : "text-ink-2")}
        >
          <DotsThree size={24} weight="bold" aria-hidden="true" />
          Más
        </button>
      </div>
    </nav>
  );
}
