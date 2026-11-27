// The merchant's business id lives in this browser after the sign-up (no accounts in the prototype).
export const BUSINESS_KEY = "negosocios.business_id";

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
    /* storage blocked: the profile still works from its link */
  }
}
