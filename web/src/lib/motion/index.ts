import type { CSSProperties } from "react";

/* The only place with durations and curves. index.css and screens read var(--motion-*), never a literal. */
export const MOTION = {
  duration: { tap: 100, route: 180, fade: 220, pulse: 1400 },
  ease: { out: "cubic-bezier(0.22, 1, 0.36, 1)", inOut: "cubic-bezier(0.45, 0, 0.55, 1)" },
  shift: 8, // px, the small vertical drift of a screen entering
} as const;

type VTDocument = Document & { startViewTransition?: (update: () => void) => unknown };

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Publishes the tokens as CSS variables; `data-vt` tells the CSS the browser animates routes itself (else a CSS fade is the fallback). */
export function applyMotionTokens() {
  const root = document.documentElement;
  const { duration, ease, shift } = MOTION;
  root.style.setProperty("--motion-tap", `${duration.tap}ms`);
  root.style.setProperty("--motion-route", `${duration.route}ms`);
  root.style.setProperty("--motion-fade", `${duration.fade}ms`);
  root.style.setProperty("--motion-pulse", `${duration.pulse}ms`);
  root.style.setProperty("--motion-ease", ease.out);
  root.style.setProperty("--motion-ease-in-out", ease.inOut);
  root.style.setProperty("--motion-shift", `${shift}px`);
  if (typeof (document as VTDocument).startViewTransition === "function") root.dataset.vt = "";
  else delete root.dataset.vt;
}

/** Runs a screen change inside a View Transition when the browser has them; otherwise (or with reduced motion) it just runs. */
export function changeRoute(update: () => void) {
  const start = (document as VTDocument).startViewTransition;
  if (!prefersReducedMotion() && typeof start === "function") start.call(document, update);
  else update();
}

export const fadeStyle = (delayMs = 0): CSSProperties => ({ animationDelay: `${delayMs}ms` });

export { FadeIn } from "./FadeIn";
