import { ArrowRight } from "@phosphor-icons/react";

// Facts come from IDEA.md §1/§4 and docs/CONTEXTO-CoDi.md; nothing here is invented.
const SOURCE = "https://www.codi.org.mx/secundarias/preguntas_frecuentes.html";

const steps = [
  { title: "Cobra", text: "Escribe el importe y muestra el QR de CoDi." },
  { title: "Recibe", text: "Tu cliente paga con su celular y ves “Pagado” en segundos." },
  { title: "Cierra el día", text: "Ventas, gastos y utilidad estimada, sin libreta." },
];

const cta =
  "inline-flex h-14 items-center justify-center gap-2 rounded-md bg-accent px-6 font-display font-medium text-accent-ink transition-colors hover:bg-accent-hover";

export default function Landing() {
  return (
    <div className="flex flex-col gap-12 py-4 md:gap-20">
      <section className="flex flex-col gap-6">
        <h1 className="font-display text-[length:var(--text-2xl)] leading-tight md:text-[length:var(--text-hero)]">
          Cobra con CoDi y sabe cuánto <span className="text-accent">ganaste hoy.</span>
        </h1>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-[length:var(--text-lg)] text-ink-2">
            Para puestos y negocios que cobran en efectivo: cobra con QR, ve la confirmación al instante y cierra el día con tu utilidad.
          </p>
          <a href="#cobrar" className={`${cta} shrink-0`}>
            Probar la demo
            <ArrowRight size={24} aria-hidden="true" />
          </a>
        </div>
        <figure className="flex flex-col gap-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-ink">
              <img
                src="/landing/cobrar-pendiente.png"
                alt="Pantalla Cobrar con el QR de CoDi listo para escanear"
                width={1568}
                height={1036}
                className="aspect-video h-auto w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full border border-ink bg-surface px-4 py-2 font-display text-[length:var(--text-s)]">
                Pendiente
              </span>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-ink">
              <img
                src="/landing/cobrar-pagado.png"
                alt="Pantalla Cobrar después del pago: el QR se atenúa y aparece Pagado"
                width={1568}
                height={1036}
                className="aspect-video h-auto w-full object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-accent px-4 py-2 font-display text-[length:var(--text-s)] text-accent-ink">
                Pagado 100 MXN
              </span>
            </div>
          </div>
          <figcaption className="text-[length:var(--text-s)] text-ink-2">
            Pantalla real de Cobrar antes y después del pago, en menos de 3 s. Datos de ejemplo.
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

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-[length:var(--text-xl)]">Así funciona</h2>
        <ol className="divide-y divide-line border-y border-ink">
          {steps.map(({ title, text }, i) => (
            <li key={title} className="grid grid-cols-[4rem_1fr] items-baseline gap-4 py-6 md:grid-cols-[6rem_14rem_1fr]">
              <span className="font-display text-[length:var(--text-xl)] text-accent" aria-hidden="true">
                {i + 1}
              </span>
              <span className="font-display text-[length:var(--text-lg)]">{title}</span>
              <span className="col-span-2 text-ink-2 md:col-span-1">{text}</span>
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
