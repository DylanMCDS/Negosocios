import { ArrowRight, ChartLineUp, CheckCircle, QrCode } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { DataBadge } from "../../lib/ui";

// Facts come from IDEA.md §1/§4 and docs/CONTEXTO-CoDi.md; nothing here is invented.
// The screens are real captures of the app (web/public/landing/*.webp) with example data.
const SOURCE = "https://www.codi.org.mx/secundarias/preguntas_frecuentes.html";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean }>;

const steps: Array<{ title: string; text: string; Icon: IconType }> = [
  { title: "Cobra", text: "Escribe el importe y muestra el QR de CoDi.", Icon: QrCode },
  { title: "Recibe", text: "Tu cliente paga con su celular y ves “Pagado” en segundos.", Icon: CheckCircle },
  { title: "Cierra el día", text: "Ventas, gastos y utilidad estimada, sin libreta.", Icon: ChartLineUp },
];

const screens = [
  { src: "/landing/cobrar.webp", label: "Cobrar: de Pendiente a Pagado", width: "w-48 md:w-56", alt: "Pantalla Cobrar con el QR de CoDi listo para escanear y el estado Pendiente" },
  { src: "/landing/cierre.webp", label: "Cierre del día", width: "w-64 md:w-80", alt: "Pantalla Cierre del día con la utilidad estimada, ventas, gastos y lista de cobros" },
  { src: "/landing/explorar.webp", label: "Explorar", width: "w-44 md:w-52", alt: "Pantalla Explorar con el mapa de negocios cercanos que cobran con CoDi" },
];

const cta =
  "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 font-display text-[length:var(--text-body)] text-accent-ink transition-colors hover:bg-accent-hover";

/* The tianguis awning: lilac and purple stripes with a scalloped edge. Own SVG, decorative. */
function Awning() {
  const stripes = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true" className="block h-8 w-full md:h-12">
      {stripes.map((i) => (
        <g key={i} className={i % 2 ? "fill-tint" : "fill-accent"}>
          <rect x={i * 10} y="0" width="10" height="9" />
          <path d={`M${i * 10} 9 a5 5 0 0 0 10 0 z`} />
        </g>
      ))}
    </svg>
  );
}

/* A phone frame around a real capture. The capture is taller than the frame: it is cropped from the top. */
function Phone({ src, alt, eager = false, crop = "object-[50%_59%]" }: { src: string; alt: string; eager?: boolean; crop?: string }) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-surface p-2 shadow-lift">
      <img
        src={src}
        alt={alt}
        width={390}
        height={1080}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`aspect-[390/760] w-full rounded-[1.5rem] object-cover ${crop}`}
      />
    </div>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-col gap-16 pb-8 md:gap-24">
      <section className="-mx-4 flex flex-col gap-8 md:mx-0">
        <Awning />
        <div className="grid gap-10 px-4 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-16 md:px-0">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[length:var(--text-2xl)] leading-tight md:text-[length:var(--text-hero)]">
              Cobra con CoDi y sabe cuánto <span className="text-money">ganaste hoy.</span>
            </h1>
            <p className="max-w-xl text-[length:var(--text-body)] text-ink-2">
              Para puestos de tianguis y negocios que cobran en efectivo: muestra el QR, ve “Pagado” al instante y cierra el
              día con tu utilidad.
            </p>
            <a href="#cobrar" className={`${cta} self-start`}>
              Probar la demo
              <ArrowRight size={24} aria-hidden="true" />
            </a>
          </div>
          <figure className="mx-auto flex w-full max-w-[20rem] flex-col gap-3 md:max-w-md">
            <div className="relative">
              <Phone eager src="/landing/pagado.webp" alt="Pantalla real de Cobrar: el cliente pagó y aparece Pagado en verde" />
              <span className="absolute -right-2 top-6 rounded-full bg-surface shadow-lift">
                <DataBadge size="sm" />
              </span>
            </div>
            <figcaption className="text-[length:var(--text-s)] text-ink-2">
              Pantalla real de la app, con datos de ejemplo.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-[length:var(--text-xl)]">Esto es lo que vas a ver</h2>
        <div className="-mx-4 flex snap-x items-center gap-6 overflow-x-auto px-4 pb-4 md:mx-0 md:justify-center md:overflow-visible md:px-0">
          {screens.map(({ src, alt, label, width }) => (
            <figure key={src} className={`flex shrink-0 snap-center flex-col gap-3 ${width}`}>
              <Phone src={src} alt={alt} crop={src.includes("cierre") || src.includes("explorar") ? "object-top" : undefined} />
              <figcaption className="font-display text-[length:var(--text-body)]">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-[length:var(--text-xl)]">Así funciona</h2>
        <ol className="divide-y divide-hairline border-y border-hairline">
          {steps.map(({ title, text, Icon }, i) => (
            <li key={title} className="flex items-center gap-4 py-6">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-tint text-accent">
                <Icon size={32} weight="duotone" aria-hidden={true} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-display text-[length:var(--text-l)]">
                  {i + 1}. {title}
                </span>
                <span className="text-ink-2">{text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2 rounded-lg bg-tint p-6 md:p-8">
        <p className="font-display text-[length:var(--text-2xl)] leading-none text-money md:text-[length:var(--text-hero)]">$0</p>
        <p className="font-display text-[length:var(--text-l)]">de comisión en cobros con CoDi</p>
        <p className="max-w-2xl text-ink-2">
          CoDi requiere internet y cuenta bancaria; las operaciones no tienen comisión. Fuente:{" "}
          <a className="underline" href={SOURCE} target="_blank" rel="noreferrer">
            codi.org.mx
          </a>
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="font-display text-[length:var(--text-xl)]">Para el comerciante</h2>
          <p className="text-ink-2">Cobra con QR o sticker NFC, ve el pago al instante y cierra el día sabiendo tu utilidad estimada.</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="font-display text-[length:var(--text-xl)]">Para el cliente</h2>
          <p className="text-ink-2">Encuentra negocios cercanos que aceptan CoDi y paga con tu celular, sin traer efectivo.</p>
        </div>
      </section>

      <section className="flex flex-col items-start gap-6 border-t border-hairline pt-8">
        <p className="font-display text-[length:var(--text-xl)]">Pruébalo ahora, sin registro.</p>
        <a
          href="#cobrar"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-tint px-6 font-display text-[length:var(--text-body)] text-accent transition-colors hover:bg-hairline"
        >
          Ir a Cobrar
          <ArrowRight size={24} aria-hidden="true" />
        </a>
      </section>

      <footer className="border-t border-hairline pt-6 text-[length:var(--text-s)] text-ink-2">
        Usa CoDi y la API de pey. Proyecto del Hackatón México 2026; no es un producto oficial de CoDi, Banxico ni pey.
      </footer>
    </div>
  );
}
