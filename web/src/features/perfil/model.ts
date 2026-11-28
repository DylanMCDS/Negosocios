export const covers = [{ id: "toldo", label: "Tianguis" }, { id: "maiz", label: "Maíz" }, { id: "cafe", label: "Café" }, { id: "flores", label: "Flores" }] as const;
export const days = [["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"], ["thu", "Jueves"], ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"]] as const;
export interface EditableProfile {
  description: string;
  cover: typeof covers[number]["id"];
  menu: Array<{ name: string; price_cents: number; featured: boolean }>;
  whatsapp: string | null;
  schedule: Record<string, { open: string; close: string } | null>;
}
export interface Profile extends EditableProfile {
  business_id: string; name: string; category: string; zone: string;
  open_now: boolean; demo_data: boolean;
  promotions: Array<{ id: string; title: string; discount_pct: number }>;
  allies: Array<{ business_id: string; name: string; discount_pct: number }>;
  reputation: { rating: number | null; reviews_count: number; endorsements: number };
  reviews: Array<{ id: string; stars: number; text: string; created_at: string }>;
}
export function editable(p: Profile): EditableProfile {
  return { description: p.description, cover: p.cover, menu: p.menu, whatsapp: p.whatsapp, schedule: p.schedule };
}
export const money = (cents: number) => !Number.isFinite(cents) || cents < 0 ? "Precio por definir" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
export const profileHash = (id: string) => `#perfil/${encodeURIComponent(id)}`;
