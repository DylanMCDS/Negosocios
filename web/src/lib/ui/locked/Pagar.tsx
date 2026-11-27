import { useState } from "react";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, Stat, Surface } from "..";
import { demoDay } from "./demoDay";

export default function Pagar() {
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 py-2">
      <PageHeader title={done ? "Listo" : "Confirma tu pago"} lead={done ? "El comerciante ya recibió tu pago." : "Revisa a quién pagas y cuánto."} />
      <p className="font-display text-[length:var(--text-s)] text-ink-2">Paso {done ? 3 : 2} de 3</p>
      <Surface className="flex flex-col gap-6">
        <div>
          <p className="text-[length:var(--text-s)] text-ink-2">Pagas a</p>
          <p className="font-display text-[length:var(--text-xl)] leading-tight">{demoDay.business}</p>
          <p className="text-ink-2">{demoDay.zone}</p>
        </div>
        <Stat label="Importe" value="100" unit="MXN" hero />
        <p>Orden de tacos</p>
        <Chip tone="ok">
          <ShieldCheck size={20} className="mr-2" aria-hidden="true" />
          Sin comisión con CoDi
        </Chip>
      </Surface>
      {done ? (
        <Button variant="secondary" onClick={() => setDone(false)}>
          <CheckCircle size={24} aria-hidden="true" />
          Pagado 100 MXN
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <Button onClick={() => setDone(true)}>Pagar 100 MXN</Button>
          <Button variant="ghost">Cancelar</Button>
        </div>
      )}
    </div>
  );
}
