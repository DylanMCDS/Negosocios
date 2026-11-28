import { useState } from "react";
import { api } from "../../lib/api";
import type { Expense, ExpenseCreate } from "../../lib/types";
import { Button, Surface } from "../../lib/ui";

export const CATEGORIES = ["insumos", "renta", "luz y agua", "gas", "transporte", "otro"];

// The business day follows Mexico City (the same zone the closing uses), not UTC: at 19:00 CDMX UTC is already tomorrow.
export const businessToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
const field = "h-14 w-full rounded-md border border-line bg-surface px-4 text-[length:var(--text-body)] text-ink";

/* Manual expense, inside Cierre. Whole pesos or two decimals; the keyboard opens numeric on a phone. */
export default function ExpenseForm({ businessId, onSaved, onCancel }: { businessId: string; onSaved: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(businessToday());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const text = amount.replace(/[$\s]/g, "").replace(",", ".");
    const cents = Math.round(Number(text) * 100);
    if (!/^\d+(\.\d{1,2})?$/.test(text) || cents <= 0) return setError("El importe debe ser mayor a 0, con hasta dos decimales.");
    if (!category) return setError("Elige una categoría.");
    setError("");
    setBusy(true);
    const body: ExpenseCreate = { business_id: businessId, amount_cents: cents, category, date, source: "manual", description: description.trim() };
    try {
      await api<Expense>("/expenses", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch {
      setError("No pudimos guardar el gasto. Tus datos siguen aquí; intenta de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Surface size="sm">
      <form className="flex flex-col gap-4" onSubmit={save}>
        <h2 className="font-display text-[length:var(--text-l)]">Agregar gasto</h2>
        <label className="flex flex-col gap-2">
          <span>Importe</span>
          <input
            className="h-20 w-full rounded-md border border-line bg-surface px-4 font-display text-[length:var(--text-xl)] font-medium text-ink"
            inputMode="decimal"
            placeholder="Ej. 350"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span>Categoría</span>
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Elige una</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span>Fecha</span>
            <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span>Descripción (opcional)</span>
          <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar gasto"}</Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        </div>
      </form>
    </Surface>
  );
}
