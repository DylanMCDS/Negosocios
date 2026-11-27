// Official CLABE check digit (weights 3-7-1 over the first 17 digits); mirrors app/services/payout_accounts.py.
const WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];

/** Empty string when the CLABE is empty or valid; otherwise a message the owner can act on. */
export function clabeError(value: string): string {
  const clabe = value.trim();
  if (clabe === "") return "";
  if (!/^\d+$/.test(clabe) || clabe.length > 18) return "La CLABE son 18 dígitos, solo números.";
  if (clabe.length < 18) return "";
  const total = WEIGHTS.reduce((sum, w, i) => sum + ((Number(clabe[i]) * w) % 10), 0);
  return (10 - (total % 10)) % 10 === Number(clabe[17])
    ? ""
    : "CLABE inválida: el dígito de control no coincide. Revisa que la escribiste completa.";
}

export const clabeComplete = (value: string) => value.trim().length === 18 && clabeError(value) === "";
