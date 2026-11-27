import { useEffect, useRef, useState } from "react";
import { CheckCircle, Microphone, Warning } from "@phosphor-icons/react";
import { Button, Chip, PageHeader, PageLayout, Surface } from "../../lib/ui";
import { api } from "../../lib/api";
import type { Expense, ExpenseCreate } from "../../lib/types";
import { getBusinessId, DEMO_BUSINESS_ID } from "../../lib/business";

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
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [speechMessage, setSpeechMessage] = useState("");

  function releaseRecognition() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = rec.current;
    rec.current = null;
    if (current) {
      current.onresult = current.onend = current.onerror = null;
      try { current.abort(); } catch { /* browser already stopped */ }
    }
  }

  useEffect(() => () => releaseRecognition(), []);

  function fallback(message: string) {
    releaseRecognition();
    setListening(false);
    setSpeechMessage(message);
    input.current?.focus();
  }

  function cancel() {
    releaseRecognition();
    setListening(false);
    setProposed(false);
    setText("");
    setPhase("idle");
    setSpeechMessage("");
    input.current?.focus();
  }

  function stop() {
    const current = rec.current;
    if (!current) return;
    try { current.stop(); } catch { fallback("No te escuché. Intenta de nuevo o escríbelo"); }
  }

  const amountCents = Math.round((Number(amount.replace(",", ".")) || 0) * 100);
  const canSave = proposed && amountCents > 0 && category.trim() !== "" && phase !== "busy";

  function dictate() {
    if (!Speech) return;
    releaseRecognition();
    setSpeechMessage("");
    setPhase("idle");
    setProposed(false);
    try {
      const r = new Speech();
      r.lang = "es-MX";
      rec.current = r;
      r.onresult = (e) => {
        if (rec.current !== r) return;
        const transcript = e.results[0]?.[0]?.transcript;
        if (!transcript?.trim()) { fallback("No te escuché. Intenta de nuevo o escríbelo"); return; }
        setText(transcript);
        releaseRecognition();
        setListening(false);
        input.current?.focus();
      };
      r.onend = () => fallback("No te escuché. Intenta de nuevo o escríbelo");
      r.onerror = (e) => fallback(e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "No tenemos permiso del micrófono. Escribe tu gasto."
        : "No te escuché. Intenta de nuevo o escríbelo");
      setListening(true);
      timer.current = setTimeout(() => fallback("No te escuché. Intenta de nuevo o escríbelo"), 8000);
      r.start();
    } catch {
      fallback("No se pudo iniciar el micrófono. Escribe tu gasto.");
    }
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
      business_id: getBusinessId() ?? DEMO_BUSINESS_ID,
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

  const confirm = proposed ? (
    <Surface size="sm">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-[length:var(--text-l)]">Esto entendí</h2>
        {ambiguous && (
          <Chip>
            <Warning size={16} aria-hidden="true" /> Corrige el importe: no pudimos leerlo con claridad.
          </Chip>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-[length:var(--text-s)] text-ink-2">Importe</span>
          <input
            className="h-20 w-full rounded-md border border-line bg-surface px-4 font-display text-[length:var(--text-xl)] font-medium text-ink"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span>Categoría</span>
            <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span>Fecha</span>
            <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span>Descripción</span>
          <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 bg-surface py-2">
          <Button onClick={save} disabled={!canSave}>
            {phase === "busy" ? "Guardando…" : "Confirmar y guardar"}
          </Button>
          <Button variant="ghost" onClick={cancel} disabled={phase === "busy"}>Cancelar</Button>
        </div>
      </div>
    </Surface>
  ) : undefined;

  const capture = (
    <Surface>
          <div className="flex flex-col gap-4">
            {Speech ? (
              <div className="flex flex-col items-start gap-4">
                <Button variant={proposed ? "secondary" : "primary"} onClick={dictate} disabled={listening || phase === "busy"}>
                  <Microphone size={40} aria-hidden="true" className={listening ? "motion-safe:animate-pulse" : ""} />
                  {listening ? "Escuchando…" : "Toca para hablar"}
                </Button>
                {listening && <Button variant="secondary" onClick={stop}>Detener</Button>}
              </div>
            ) : (
              <p className="text-[length:var(--text-s)] text-ink-2">Tu navegador no entiende voz; escribe el gasto.</p>
            )}
            {speechMessage && <p role="status">{speechMessage}</p>}
            <p className="text-ink-2">Paso {proposed ? "2 de 2: confirma el gasto" : "1 de 2: habla o escribe tu gasto"}</p>
            <label className="flex flex-col gap-2">
              <span>Lo que dijiste</span>
              <input ref={input} className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder="gasté 350 en tortillas" />
            </label>
            {!proposed && <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={interpret} disabled={!text.trim() || listening || phase === "busy"}>
                {phase === "busy" ? "Interpretando…" : "Interpretar"}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={phase === "busy"}>Cancelar</Button>
            </div>}
          </div>
        </Surface>
  );

  return (
    <>
      <PageHeader title="Gastos por voz" lead="Di tu gasto y confírmalo antes de guardar." />
      <PageLayout aside={proposed ? capture : undefined}>
        {proposed ? confirm : capture}
        {phase === "saved" && (
          <p role="status" className="flex items-center gap-2">
            <CheckCircle size={24} aria-hidden="true" /> Gasto guardado.
            <a href="#cierre" className="underline">Ver en Cierre</a>
          </p>
        )}
        {phase === "failed" && <p role="alert">No se pudo completar. Intenta de nuevo.</p>}
      </PageLayout>
    </>
  );
}
