import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, QrCode } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, PageLayout, Stat, Surface } from "..";

// The URL a client opens; demo placeholder, the real one comes from the order.
const PAY_URL = "https://negosocios.example/pagar/demo-order-3";

function QrCubes({ dim }: { dim: boolean }) {
  const { size, data } = useMemo(() => QRCode.create(PAY_URL, { errorCorrectionLevel: "M" }).modules, []);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="Código QR de cobro CoDi"
      className={`aspect-square w-full max-w-[420px] fill-ink transition-opacity duration-300 ${dim ? "opacity-15" : ""}`}
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

export default function Cobrar() {
  const initial = new URLSearchParams(window.location.search).get("estado") === "pagado";
  const [paid, setPaid] = useState(initial);
  return (
    <>
      <PageHeader title="Cobrar" lead="Muestra el QR. Tu cliente paga con su celular." />
      <PageLayout
        aside={
          <Surface className="flex flex-col gap-6">
            <Stat label="Importe" value="100" unit="MXN" hero />
            <p className="text-ink-2">Orden de tacos</p>
            <div aria-live="polite">
              {paid ? <Chip tone="ok">Pagado 100 MXN</Chip> : <Chip tone="warn">Pendiente</Chip>}
            </div>
            <Button variant={paid ? "secondary" : "primary"} onClick={() => setPaid((p) => !p)}>
              {paid ? <CheckCircle size={24} aria-hidden="true" /> : <QrCode size={24} aria-hidden="true" />}
              {paid ? "Cobrar otra orden" : "Simular pago"}
            </Button>
          </Surface>
        }
      >
        <div className="relative flex justify-center rounded-lg border border-line bg-tint p-6 md:p-12">
          <QrCubes dim={paid} />
          {paid && (
            <p className="absolute inset-0 grid place-content-center text-center font-display text-[length:var(--text-2xl)] text-accent md:text-[length:var(--text-hero)]">
              Pagado
              <span className="block text-[length:var(--text-xl)] text-ink">100 MXN</span>
            </p>
          )}
        </div>
      </PageLayout>
    </>
  );
}
