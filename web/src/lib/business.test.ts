import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUSINESS_KEY, DEMO_BUSINESS_ID, getBusinessId, listMyBusinesses, resolveActiveBusiness, saveBusinessId, setActiveBusiness, validateSavedBusiness } from "./business";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("Puesto activo", () => {
  it("stale_saved_business_falls_back_to_demo", async () => {
    localStorage.setItem(BUSINESS_KEY, "ghost");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    await validateSavedBusiness();
    expect(localStorage.getItem(BUSINESS_KEY)).toBeNull();
    expect(getBusinessId()).toBeNull(); // null = el puesto demo en todas las pantallas
    expect((await resolveActiveBusiness()).id).toBe(DEMO_BUSINESS_ID);
  });

  it("switching_business_changes_active_id", () => {
    saveBusinessId("b-1", "Tacos Uno");
    saveBusinessId("b-2", "Tacos Dos");
    expect(getBusinessId()).toBe("b-2");
    expect(listMyBusinesses().map((b) => b.id)).toEqual(["b-1", "b-2"]);
    setActiveBusiness("b-1");
    expect(getBusinessId()).toBe("b-1");
    setActiveBusiness(null); // el demo
    expect(getBusinessId()).toBeNull();
    expect(listMyBusinesses()).toHaveLength(2);
  });
});
