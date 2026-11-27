// The active business ("puesto activo"): the one saved by the sign-up in this browser, else the demo business.
import { api } from "./api";
import type { Business } from "./types";

export const BUSINESS_KEY = "negosocios.business_id";
export const DEMO_BUSINESS_ID = "rosa";

export function getBusinessId(): string | null {
  try {
    return localStorage.getItem(BUSINESS_KEY);
  } catch {
    return null;
  }
}

export function saveBusinessId(id: string): void {
  try {
    localStorage.setItem(BUSINESS_KEY, id);
  } catch {
    /* storage blocked: the sign-up still worked for this session */
  }
}

// Saved business if it still exists on the server (a restarted database loses it), else the demo one.
export async function resolveActiveBusiness(): Promise<{ id: string; name: string | null }> {
  const saved = getBusinessId();
  if (saved) {
    try {
      const business = await api<Business>(`/businesses/${encodeURIComponent(saved)}`);
      return { id: business.id, name: business.name };
    } catch {
      /* fall through to the demo business */
    }
  }
  return { id: DEMO_BUSINESS_ID, name: null };
}
