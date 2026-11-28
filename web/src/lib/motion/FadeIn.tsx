import type { ReactNode } from "react";

/** A block that fades in (opacity + a small transform) instead of appearing at once: long state screens (Pagado, Comprobante). */
export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-testid="fade-in" className={["motion-fade-in", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
