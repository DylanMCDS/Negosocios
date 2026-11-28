// The only door to the backend: every route lives under /api.
/** A failed request keeps what the server said, so screens can show the real reason instead of a generic error. */
export class ApiError extends Error {
  status: number;
  detail: string | null;
  constructor(status: number, detail: string | null, statusText = "") {
    super(`${status} ${statusText}`.trim());
    this.status = status;
    this.detail = detail;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    let detail: string | null = null;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* the body is not JSON: only the status is known */
    }
    throw new ApiError(response.status, detail, response.statusText);
  }
  return (await response.json()) as T;
}

/** An order can still be paid: pending and not past `expires_at` (10 minutes after it was created). */
export const isLive = (order: { status: string; expires_at: string | null }): boolean =>
  order.status === "pending" && (order.expires_at === null || new Date(order.expires_at).getTime() > Date.now());
