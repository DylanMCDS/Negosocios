import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Aliados from "./index";

const base = {
  business_a: "rosa", business_b: "x", giver: "rosa", status: "active", discount_pct: 8, budget_cents: 30000,
  budget_used_cents: 0, max_uses: 37, uses: 0, partner_id: "x", demo: false,
};
const alliances = [
  { ...base, id: "al-1", referral_code: "A1B2C3D4", partner_name: "Café Lupita", role: "giver" },
  { ...base, id: "al-2", giver: "x", referral_code: "ZZ99YY88", partner_name: "Papelería Sol", role: "referrer" },
];

function mockApi() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = url.includes("/metrics")
      ? { referrals: 0, paid_purchases: 0, paid_sales_cents: 0, benefit_cost_cents: 0, estimated_contribution_cents: 0, note: "n" }
      : url.includes("/network") ? [] : alliances;
    return new Response(JSON.stringify(body), { status: 200 });
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("alliance code", () => {
  it("active_giver_alliance_shows_copyable_code", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<Aliados />);
    const lupita = (await screen.findByText("Café Lupita")).closest("li") as HTMLElement;
    expect(within(lupita).getByText("A1B2C3D4")).toBeInTheDocument();
    await user.click(within(lupita).getByRole("button", { name: "Copiar" }));
    expect(await navigator.clipboard.readText()).toBe("A1B2C3D4");
    const share = within(lupita).getByRole("link", { name: /Compartir por WhatsApp/ });
    expect(share.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(share.getAttribute("href") ?? "")).toContain("A1B2C3D4");
    expect(within(lupita).getByRole("img", { name: /QR del código A1B2C3D4/ })).toBeInTheDocument();
    // Where the other business gives the discount, nothing to copy: the code is theirs.
    const sol = screen.getByText("Papelería Sol").closest("li") as HTMLElement;
    expect(within(sol).getByText(/Tus clientes reciben el código de Papelería Sol/)).toBeInTheDocument();
    expect(within(sol).queryByRole("button", { name: "Copiar" })).toBeNull();
  });
});
