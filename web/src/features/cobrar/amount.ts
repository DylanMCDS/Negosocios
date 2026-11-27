// Amounts are typed as text and parsed as text: never multiply floats (0.1 * 100 is not 10).
const MAX_INTEGER_DIGITS = 6;

export function appendKey(text: string, key: string): string {
  if (key === ".") return text.includes(".") ? text : text === "" ? "0." : `${text}.`;
  if (!/^\d$/.test(key)) return text;
  const [integer, fraction] = text.split(".");
  if (fraction !== undefined) return fraction.length >= 2 ? text : text + key;
  if (integer === "0") return key; // no leading zeros: "05" is "5"
  return integer.length >= MAX_INTEGER_DIGITS ? text : text + key;
}

export function toCents(text: string): number {
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(text);
  if (!match) return 0;
  const [, integer, fraction = ""] = match;
  return parseInt(integer || "0", 10) * 100 + parseInt(fraction.padEnd(2, "0") || "0", 10);
}

export function formatCents(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export const formatAmount = (text: string): string => formatCents(toCents(text));
