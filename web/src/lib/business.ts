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

export const MINE_KEY = "negosocios.businesses";
export const DEMO_BUSINESS_NAME = "Tacos de Doña Rosa (demo)";
export const BUSINESS_CHANGED = "negosocios:business-changed";
export interface MyBusiness { id: string; name: string }

const changed = () => window.dispatchEvent(new Event(BUSINESS_CHANGED));

// The businesses registered in this browser (the demo one is not stored: it is the fallback).
export function listMyBusinesses(): MyBusiness[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((b): b is MyBusiness => typeof b?.id === "string" && typeof b?.name === "string") : [];
  } catch {
    return [];
  }
}

// Saves a freshly registered business, remembers it in "Mis puestos" and makes it the active one.
export function saveBusinessId(id: string, name?: string): void {
  try {
    localStorage.setItem(BUSINESS_KEY, id);
    if (name !== undefined) {
      const rest = listMyBusinesses().filter((b) => b.id !== id);
      localStorage.setItem(MINE_KEY, JSON.stringify([...rest, { id, name }]));
    }
  } catch {
    /* storage blocked: the sign-up still worked for this session */
  }
  changed();
}

// null = the demo business: every screen already falls back to it when getBusinessId() is null.
export function setActiveBusiness(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(BUSINESS_KEY);
    else localStorage.setItem(BUSINESS_KEY, id);
  } catch {
    /* storage blocked */
  }
  changed();
}

// Name of the active business for the header.
export function activeBusinessName(): string {
  const id = getBusinessId();
  return (id && listMyBusinesses().find((b) => b.id === id)?.name) || DEMO_BUSINESS_NAME;
}

// Run once at start: a saved business that the server no longer knows (a redeploy resets the database) is dropped,
// so from then on getBusinessId() is either a business that exists or null (= the demo one) for every screen.
export async function validateSavedBusiness(): Promise<void> {
  const saved = getBusinessId();
  if (!saved) return;
  try {
    await api<Business>(`/businesses/${encodeURIComponent(saved)}`);
  } catch (error) {
    // Only a "not found" clears it: a network blip must not wipe the owner's puesto.
    if (!(error instanceof Error && error.message.startsWith("404"))) return;
    try {
      localStorage.removeItem(BUSINESS_KEY);
      localStorage.setItem(MINE_KEY, JSON.stringify(listMyBusinesses().filter((b) => b.id !== saved)));
    } catch {
      /* ignore */
    }
    changed();
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
