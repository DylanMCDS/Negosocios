import { useRef, useState } from "react";
import { CheckCircle, Microphone, Warning } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, PageLayout, Surface } from "../../lib/ui";
import { api } from "../../lib/api";
import type { Expense, ExpenseCreate } from "../../lib/types";

// Demo merchant: the real id comes from the business profile (HACK-006).
const BUSINESS_ID = "rosa";

interface Parsed {
  amount_cents: number | null;
  category: string;
  description: string;
  ambiguous: boolean;
}

// Minimal typing for the Web Speech API (not in lib.dom for every browser).
interface Recognition {
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}
type RecognitionCtor = new () => Recognition;

function speechCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const today = () => new Date().toISOString().slice(0, 10);
const field =
  "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] text-ink";

export default function Voz() {
  const Speech = speechCtor();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [ambiguous, setAmbiguous] = useState(false);
  const [proposed, setProposed] = useState(false);
  const [phase, setPhase] = useState<"idle" | "busy" | "saved" | "failed">("idle");
  const rec = useRef<Recognition | null>(null);

  const amountCents = Math.round((Number(amount.replace(",", ".")) || 0) * 100);
  const canSave = proposed && amountCents > 0 && category.trim() !== "" && phase !== "busy";

  function dictate() {
    if (!Speech) return;
    const r = new Speech();
    r.lang = "es-MX";
    r.onresult = (e) => setText(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  // Proposes only: nothing is saved until the user confirms.
  async function interpret() {
    setPhase("busy");
    try {
      const p = await api<Parsed>("/expenses/parse", { method: "POST", body: JSON.stringify({ text }) });
      setAmount(p.amount_cents == null ? "" : (p.amount_cents / 100).toFixed(2));
      setCategory(p.category);
      setDescription(p.description);
      setAmbiguous(p.ambiguous);
      setProposed(true);
      setPhase("idle");
    } catch {
      setPhase("failed");
    }
  }

  async function save() {
    setPhase("busy");
    const body: ExpenseCreate = {
      business_id: BUSINESS_ID,
      amount_cents: amountCents,
      category: category.trim(),
      date,
      source: "voice",
      description: description.trim(),
    };
    try {
      await api<Expense>("/expenses", { method: "POST", body: JSON.stringify(body) });
      setPhase("saved");
      setProposed(false);
      setText("");
    } catch {
      setPhase("failed");
    }
  }

  return (
    <PageLayout>
      <PageHeader title="Gastos por voz" lead="Di tu gasto y confírmalo antes de guardar." />
      <div className="flex flex-col gap-6 py-8">
        <Surface>
          <div className="flex flex-col gap-4">
            {Speech ? (
              <Button onClick={dictate} disabled={listening}>
                <Microphone size={24} aria-hidden="true" /> {listening ? "Escuchando…" : "Dictar"}
              </Button>
            ) : (
              <p className="text-[length:var(--text-s)] text-ink-2">
                Tu navegador no entiende voz; escribe el gasto.
              </p>
            )}
            <label className="flex flex-col gap-2">
              <span>Lo que dijiste</span>
              <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="gasté 350 en tortillas" />
            </label>
            <Button variant="secondary" onClick={interpret} disabled={!text.trim() || phase === "busy"}>
              Interpretar
            </Button>
          </div>
        </Surface>

        {proposed && (
          <Surface>
            <div className="flex flex-col gap-4">
              {ambiguous && (
                <Chip>
                  <Warning size={16} aria-hidden="true" /> Corrige el importe: no pudimos leerlo con claridad.
                </Chip>
              )}
              <label className="flex flex-col gap-2">
                <span>Importe</span>
                <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="flex flex-col gap-2">
                <span>Categoría</span>
                <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} />
              </label>
              <label className="flex flex-col gap-2">
                <span>Descripción</span>
                <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="flex flex-col gap-2">
                <span>Fecha</span>
                <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <Button onClick={save} disabled={!canSave}>
                Confirmar y guardar
              </Button>
            </div>
          </Surface>
        )}

        {phase === "saved" && (
          <p role="status" className="flex items-center gap-2">
            <CheckCircle size={24} aria-hidden="true" /> Gasto guardado.
          </p>
        )}
        {phase === "failed" && <p role="alert">No se pudo completar. Intenta de nuevo.</p>}
      </div>
    </PageLayout>
  );
}
