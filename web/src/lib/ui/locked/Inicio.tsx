import { CheckCircle } from "@phosphor-icons/react";
import { Button, Chip, Surface } from "..";

/* Locked "Inicio" (direction R1-v1, tianguis): the hero is the real Cobrar screen turning "Pagado".
   The real landing (features/landing) copies this composition. Copy comes from IDEA.md §1, §2, §4.
   "< 3 s" is the wow TARGET stated in IDEA.md, not a measurement: it is labeled as a target and
   must stay that way until it is measured with a real payment. */

// Tianguis awning: lilac and purple stripes with a scalloped edge. Pure CSS, no image.
const toldo = {
  background: [
    "radial-gradient(circle at 20px 0, var(--accent) 19.5px, transparent 20px) 0 21px / 80px 23px repeat-x",
    "radial-gradient(circle at 60px 0, var(--tint) 19.5px, transparent 20px) 0 21px / 80px 23px repeat-x",
    "linear-gradient(90deg, var(--accent) 50%, var(--tint) 50%) 0 0 / 80px 22px repeat-x",
  ].join(", "),
};

const STEPS: Array<[string, string]> = [
  ["Da de alta tu puesto", "Nombre, giro y zona. Recibes un perfil público y un QR."],
  ["Crea un cobro", "Importe y concepto. El QR de la orden queda pendiente."],
  ["El cliente escanea y autoriza", "Tu celular dice “Pagado 100 MXN” y ambos tienen comprobante."],
  ["Dicta un gasto", "“Gasté 350 en tortillas”. Tú confirmas o corriges."],
  ["Abre el cierre del día", "Ventas, gastos, utilidad estimada y pendientes."],
  ["Simula una promoción", "El descuento máximo que conserva tu contribución mínima."],
];

export default function Inicio() {
  return (
    <div className="-mx-4 -mt-6 md:-mx-8">
      <div aria-hidden="true" className="h-11" style={toldo} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-6 md:grid-cols-[1fr_420px] md:items-center md:px-8 md:pt-12">
        <div className="flex flex-col gap-5">
          <span className="inline-flex items-center gap-2 font-semibold text-ink-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-money" />
            Doña Rosa · puesto de tacos
          </span>
          <h1 className="text-[length:var(--text-2xl)] leading-[1.04] md:text-[length:var(--text-hero)]">
            <span className="text-money">Pagado</span> al momento.
          </h1>
          <p className="max-w-[30ch] text-ink-2">Tu cliente paga con su celular y tu puesto recibe la confirmación verificada.</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button onClick={() => (window.location.hash = "cobrar")}>Cobrar con QR</Button>
            <Button variant="secondary" onClick={() => document.getElementById("como")?.scrollIntoView({ behavior: "smooth" })}>
              Ver cómo funciona
            </Button>
          </div>
        </div>
        <div className="mx-auto flex w-full flex-col items-center">
          <div className="w-[272px] rounded-[32px] bg-surface p-2.5 shadow-lift md:w-[400px]">
            <div className="relative aspect-[390/586] overflow-hidden rounded-[24px]">
              <img
                src="/design-lock/screens/cobrar-pagado-390.png"
                width={390}
                height={1080}
                alt="Pantalla Cobrar de Negosocios: el QR de la orden marcado como Pagado, 100 pesos"
                className="absolute left-0 block h-auto w-full"
                style={{ top: "-34.1%" }}
              />
            </div>
          </div>
          <Surface size="sm" className="-mt-4 flex min-w-44 -rotate-3 flex-col gap-0.5 self-start rounded-md md:ml-6">
            <small className="text-ink-2">Orden de tacos</small>
            <b className="font-display text-[length:var(--text-l)]">100 MXN</b>
            <Chip tone="ok" size="sm">
              <CheckCircle size={16} className="mr-1" aria-hidden="true" />
              Pagado
            </Chip>
          </Surface>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 md:px-8">
        <dl className="grid grid-cols-3 divide-x divide-hairline border-y border-hairline py-5">
          {[
            ["Meta: < 3 s", "del pago al aviso en el puesto, aún sin medir"],
            ["$0", "de comisión en operaciones CoDi"],
            ["6", "pasos, del alta al cierre del día"],
          ].map(([figure, caption]) => (
            <div key={figure} className="flex flex-col gap-1 px-3 first:pl-0 md:px-8">
              <dt className="font-display text-[length:var(--text-xl)] leading-none">{figure}</dt>
              <dd className="text-ink-2">{caption}</dd>
            </div>
          ))}
        </dl>
        <p className="pt-3 text-ink-2">CoDi requiere internet y cuenta bancaria.</p>
      </div>

      <section id="como" className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 md:px-8">
        <h2 className="text-[length:var(--text-xl)]">Del puesto al cierre</h2>
        <ol className="flex flex-col divide-y divide-hairline">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex items-start gap-4 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint font-display text-accent">{i + 1}</span>
              <p>
                <b className="font-display text-[length:var(--text-body)]">{title}</b>
                <span className="block text-ink-2">{text}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
