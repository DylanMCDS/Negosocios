import { useEffect, useState } from "react";
import { CalendarCheck, Lightbulb } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { Button, Chip, SectionHeader } from "../../lib/ui";
import { mxn } from "../../lib/ui/locked/demoDay";

interface Rec {
  kind: string;
  key?: string;
  text: string;
  period: string;
  data_used: unknown[];
  missing_data: string[];
}
interface Commitment {
  key: string;
  label: string;
  amount_cents: number;
  days_until: number;
  daily_reserve_cents: number;
}
interface Data {
  recommendations: Rec[];
  commitments: Commitment[];
}

const valid = (d: unknown): d is Data =>
  typeof d === "object" && d !== null && Array.isArray((d as Data).recommendations) && Array.isArray((d as Data).commitments);

const when = (n: number) => (n < 0 ? `Venció hace ${-n} días` : n === 0 ? "Hoy" : `En ${n} ${n === 1 ? "día" : "días"}`);

export default function Recomendaciones({ businessId }: { businessId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<unknown>(`/recommendations?business_id=${encodeURIComponent(businessId)}`).then(
      (d) => (valid(d) ? setData(d) : undefined),
      () => undefined,
    );
  }, [businessId]);

  // Nothing is a commitment until the owner confirms it here.
  async function decide(key: string, decision: "confirm" | "dismiss") {
    setFailed(false);
    try {
      const d = await api<unknown>("/recommendations/decision", {
        method: "POST",
        body: JSON.stringify({ business_id: businessId, key, decision }),
      });
      if (valid(d)) setData(d);
    } catch {
      setFailed(true);
    }
  }

  if (!data) return null;
  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionHeader title="Recomendaciones" size="sm" />
        <ul className="flex flex-col divide-y divide-hairline">
          {data.recommendations.map((r) => (
            <li key={`${r.kind}-${r.key ?? r.text}`} className="flex flex-col gap-2 py-3">
              <p className="flex items-start gap-3 font-semibold">
                <Lightbulb size={24} aria-hidden="true" className="mt-0.5 shrink-0" />
                {r.text}
              </p>
              {r.missing_data.length > 0 && (
                <p className="text-[length:var(--text-s)] text-ink-2">{`Faltan: ${r.missing_data.join(", ")}`}</p>
              )}
              {r.kind === "recurring_proposal" && r.key && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(r.key!, "confirm")}>Confirmar</Button>
                  <Button size="sm" variant="secondary" onClick={() => decide(r.key!, "dismiss")}>Descartar</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {failed && <p role="alert">No pudimos guardar tu decisión. Intenta de nuevo.</p>}
      </section>
      <section className="flex flex-col gap-2">
        <SectionHeader title="Pagos próximos" size="sm" />
        {data.commitments.length === 0 ? (
          <p className="text-ink-2">Confirma una recomendación para verla aquí.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {data.commitments.map((c) => (
              <li key={c.key} className="flex min-h-14 items-center gap-4 py-2">
                <CalendarCheck size={28} aria-hidden="true" />
                <p className="flex-1 font-semibold">{c.label}</p>
                <p className="font-display">{mxn(c.amount_cents)}</p>
                <Chip size="sm">{when(c.days_until)}</Chip>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
