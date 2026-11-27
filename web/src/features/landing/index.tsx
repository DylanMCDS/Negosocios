import { ArrowRight, QrCode, Receipt, SealCheck } from "@phosphor-icons/react";

// Facts come from IDEA.md §1/§4 and docs/CONTEXTO-CoDi.md; nothing here is invented.
const SOURCE = "https://www.codi.org.mx/secundarias/preguntas_frecuentes.html";

const steps = [
  { icon: QrCode, title: "Cobra", text: "Escribe el importe y muestra el QR de CoDi." },
  { icon: SealCheck, title: "Recibe", text: "Tu cliente paga con su celular y ves “Pagado” en segundos." },
  { icon: Receipt, title: "Cierra el día", text: "Ventas, gastos y utilidad estimada, sin libreta." },
];

const cta =
  "inline-flex h-14 items-center justify-center gap-2 rounded-md bg-accent px-6 font-display font-medium text-accent-ink transition-colors hover:bg-accent-hover";

export default function Landing() {
  return (
    <div className="flex flex-col gap-16 py-4 md:gap-24">
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-[length:var(--text-2xl)] leading-tight md:text-[length:var(--text-hero)]">
            Cobra con CoDi y sabe cuánto ganaste hoy.
          </h1>
          <p className="max-w-xl text-[length:var(--text-lg)] text-ink-2">
            Para puestos y negocios que cobran en efectivo: cobra con QR, ve la confirmación al instante y cierra el día con tu utilidad.
          </p>
          <div>
            <a href="#cobrar" className={cta}>
              Probar la demo
              <ArrowRight size={24} aria-hidden="true" />
            </a>
          </div>
        </div>
        <figure className="flex flex-col gap-3">
          <img
            src="/landing/cobrar-pagado-1280.png"
            alt="Pantalla Cobrar: el QR se atenúa y aparece “Pagado”; el importe es 100 MXN"
            width={1280}
            height={720}
            className="h-auto w-full rounded-lg border border-line"
          />
          <figcaption className="text-[length:var(--text-s)] text-ink-2">
            Pantalla real de Cobrar al confirmarse el pago. Datos de ejemplo.
          </figcaption>
        </figure>
      </section>

      <section className="flex flex-col gap-3 border-t border-ink pt-8">
        <p className="font-display text-[length:var(--text-xl)] text-accent">Sin comisión</p>
        <p className="max-w-2xl text-ink-2">
          CoDi requiere internet y cuenta bancaria; las operaciones no tienen comisión. Fuente:{" "}
          <a className="underline" href={SOURCE} target="_blank" rel="noreferrer">
            codi.org.mx
          </a>
        </p>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="font-display text-[length:var(--text-xl)]">Así funciona</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
              <Icon size={32} aria-hidden="true" />
              <p className="font-display text-[length:var(--text-s)] text-ink-2">Paso {i + 1}</p>
              <p className="font-display text-[length:var(--text-lg)]">{title}</p>
              <p className="text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col items-start gap-6 rounded-lg bg-tint p-8">
        <p className="font-display text-[length:var(--text-xl)]">Pruébalo ahora, sin registro.</p>
        <a href="#cobrar" className={cta}>
          Ir a Cobrar
          <ArrowRight size={24} aria-hidden="true" />
        </a>
      </section>

      <footer className="border-t border-line pt-6 text-[length:var(--text-s)] text-ink-2">
        Usa CoDi y la API de pey. Proyecto del Hackatón México 2026; no es un producto oficial de CoDi, Banxico ni pey.
      </footer>
    </div>
  );
}
