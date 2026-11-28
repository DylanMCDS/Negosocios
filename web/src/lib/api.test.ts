import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("api_error_keeps_status_and_detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ detail: "La orden ya venció; genera otro cobro" }), { status: 409, statusText: "Conflict" }),
    ));
    const err = await api("/orders/1/split", { method: "POST" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { status?: number }).status).toBe(409);
    expect((err as { detail?: string }).detail).toBe("La orden ya venció; genera otro cobro");
  });
});
