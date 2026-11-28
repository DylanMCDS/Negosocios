import type { ButtonHTMLAttributes, ElementType, ReactNode } from "react";
import { Database } from "@phosphor-icons/react";

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

export type Size = "sm" | "md";

/* Button: one primary per screen. sm = 44 px, md = 56 px. Disabled = muted fill, not accent at low opacity. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: Size }) {
  const look = {
    primary: "bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-ink",
    secondary: "bg-tint text-accent hover:bg-hairline disabled:bg-disabled disabled:text-disabled-ink",
    ghost: "bg-transparent text-ink hover:bg-tint disabled:text-disabled-ink",
  }[variant];
  const dims = size === "sm" ? "h-11 px-4 text-[length:var(--text-s)]" : "h-14 px-6 text-[length:var(--text-body)]";
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-display motion-press cursor-pointer disabled:cursor-not-allowed",
        look,
        dims,
        className,
      )}
    />
  );
}

/* Surface: the one container level. Hairline, no nesting. */
export function Surface({
  as: Tag = "section",
  size = "md",
  className,
  children,
}: {
  as?: ElementType;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cx("rounded-lg bg-surface shadow-lift", size === "sm" ? "p-4" : "p-6 md:p-8", className)}>
      {children}
    </Tag>
  );
}

export function Chip({
  tone = "neutral",
  size = "md",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "bad";
  size?: Size;
  children: ReactNode;
}) {
  const look = {
    neutral: "bg-tint text-ink",
    ok: "bg-ok text-ok-ink",
    warn: "bg-warn text-warn-ink",
    bad: "bg-bad text-bad-ink",
  }[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full font-display",
        look,
        size === "sm" ? "h-7 px-3 text-[length:var(--text-s)]" : "h-9 px-4 text-[length:var(--text-body)]",
      )}
    >
      {children}
    </span>
  );
}

/* Stat: number first, then unit, then label. hero = the biggest thing on the screen. */
export function Stat({
  label,
  value,
  unit,
  hero = false,
  size = "md",
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  hero?: boolean;
  size?: Size;
  note?: ReactNode;
}) {
  const big = hero ? "text-[length:var(--text-2xl)] md:text-[length:var(--text-hero)]" : size === "sm" ? "text-[length:var(--text-l)]" : "text-[length:var(--text-xl)]";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[length:var(--text-s)] text-ink-2">{label}</p>
      <p className={cx("font-display leading-none tracking-tight", big)}>
        {value}
        {unit && <span className="ml-2 text-[length:var(--text-s)] text-ink-2">{unit}</span>}
      </p>
      {note && <div className="text-[length:var(--text-s)] text-ink-2">{note}</div>}
    </div>
  );
}

export function SectionHeader({ title, action, size = "md" }: { title: string; action?: ReactNode; size?: Size }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3">
      <h2 className={size === "sm" ? "text-[length:var(--text-body)]" : "text-[length:var(--text-l)]"}>{title}</h2>
      {action}
    </div>
  );
}

/* DataBadge: every number that comes from demo_data says so. */
export function DataBadge({ size = "sm" }: { size?: Size }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-2 font-display text-ink-2",
        size === "sm" ? "h-7 px-3 text-[length:var(--text-s)]" : "h-9 px-4 text-[length:var(--text-body)]",
      )}
    >
      <Database size={16} aria-hidden="true" />
      Datos de ejemplo
    </span>
  );
}

export function PageHeader({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
      <div className="flex max-w-[28ch] flex-col gap-2 md:max-w-none">
        <h1 className="text-[length:var(--text-xl)] leading-tight md:text-[length:var(--text-2xl)]">{title}</h1>
        {lead && <p className="max-w-[48ch] text-ink-2">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

/* PageLayout: main + optional side panel (360-420 px at 1280). */
export function PageLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={cx("grid gap-8 py-8", aside ? "lg:grid-cols-[minmax(0,1fr)_400px]" : undefined)}>
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
      {aside && <aside className="flex min-w-0 flex-col gap-6">{aside}</aside>}
    </div>
  );
}

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

/* NavBar: top segmented bar from 768 px; bottom bar with icon + label at 390. 6 entries at most. */
export function NavBar({ items, active, onSelect }: { items: NavItem[]; active: string; onSelect: (id: string) => void }) {
  return (
    <>
      <nav aria-label="Principal" className="sticky top-0 z-10 hidden border-b border-hairline bg-bg md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <a href="#landing" className="font-display text-[length:var(--text-l)] text-accent">negosocios</a>
          <ul className="flex gap-1 rounded-full bg-surface p-1 shadow-lift">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={item.id === active ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                  className={cx(
                    "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-display text-[length:var(--text-s)]",
                    item.id === active ? "bg-accent text-accent-ink" : "text-ink hover:bg-tint",
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface shadow-bar md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === active ? "page" : undefined}
                onClick={() => onSelect(item.id)}
                className={cx(
                  "flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-0.5 font-display text-[0.875rem]",
                  item.id === active ? "bg-tint text-accent" : "text-ink-2",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      {nav}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-16">{children}</main>
    </div>
  );
}

/* Skeleton: a loading placeholder with the size of the final content (give it the same height), so nothing jumps when data arrives. */
export function Skeleton({ className }: { className?: string }) {
  return <div data-testid="skeleton" aria-hidden="true" className={cx("motion-pulse rounded-md bg-tint", className)} />;
}
export function SkeletonList({ rows = 3, label = "Cargando", rowClassName = "h-20" }: { rows?: number; label?: string; rowClassName?: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={rowClassName} />)}
    </div>
  );
}
