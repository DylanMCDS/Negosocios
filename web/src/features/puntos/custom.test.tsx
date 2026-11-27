import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { api } from "../../lib/api";
import Puntos from "./index";
vi.mock("../../lib/api", () => ({ api: vi.fn() }));
vi.mock("../../lib/business", () => ({ resolveActiveBusiness: async () => ({ id: "rosa" }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); });
const business = { id: "rosa", name: "Tacos de Rosa", demo_data: true };
const point = { id: "p1", kind: "table", label: "Mesa 3", icon: "table", target: "assigned",
  active: true, path: "/p/p1", demo_data: true, pending_count: 1,
  assigned_orders: [{ id: "o1", amount_cents: 5, status: "pending", concept: "Taco" }] };
it("copy_never_says_asociar_cuenta", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.includes("pending-orders") ? [] : { business, points: [point] });
  render(<Puntos />);
  expect(await screen.findByText("Asignar cobro a este punto")).toBeInTheDocument();
  expect(document.body.textContent?.toLowerCase()).not.toContain("cuenta");
  expect(screen.getByRole("list", { name: "Cobrar en una mesa" }).children).toHaveLength(3);
});
it("point_list_shows_assigned_order_status", async () => {
  vi.mocked(api).mockImplementation(async (path) => path.includes("pending-orders") ? [] : { business, points: [point] });
  render(<Puntos />);
  expect(await screen.findByRole("button", { name: /Mesa 3.*\$0.05.*Pendiente/ })).toBeInTheDocument();
});
it("creates_custom_point_with_icon_and_destination", async () => {
  let saved: Record<string, unknown> = {};
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (path.includes("pending-orders")) return [];
    if (init?.method === "POST") { saved = JSON.parse(String(init.body)); return point; }
    return { business, points: [] };
  });
  render(<Puntos />);
  fireEvent.change(await screen.findByLabelText("Nombre del punto"), { target: { value: "Terraza" } });
  fireEvent.change(screen.getByLabelText("Ícono"), { target: { value: "plant" } });
  fireEvent.change(screen.getByLabelText("Qué abre"), { target: { value: "profile" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear punto" }));
  await screen.findByText("Punto creado. Puedes imprimirlo o grabarlo en NFC.");
  expect(saved).toMatchObject({ label: "Terraza", icon: "plant", target: "profile" });
});

it("poll_refreshes_status_and_ignores_older_response_after_creation", async () => {
  const created = { ...point, id: "new", label: "Barra", path: "/p/new" };
  let reads = 0;
  let finishOld: (value: unknown) => void = () => undefined;
  vi.mocked(api).mockImplementation(async (path, init) => {
    if (path.includes("pending-orders")) return [];
    if (init?.method === "POST") return created;
    reads++;
    if (reads === 2) return new Promise((resolve) => { finishOld = resolve; });
    return { business, points: reads >= 3 ? [created, { ...point, assigned_orders: [{ ...point.assigned_orders[0], status: "paid" }] }] : [point] };
  });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.useFakeTimers();
  await act(async () => { render(<Puntos />); });
  expect(screen.getByRole("img", { name: "QR del punto Mesa 3" })).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(reads).toBe(2);
  fireEvent.change(screen.getByLabelText("Nombre del punto"), { target: { value: "Barra" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Crear punto" })); });
  expect(reads).toBe(3);
  expect(screen.getByLabelText("URL del punto")).toHaveValue(window.location.origin + "/p/new");
  await act(async () => { finishOld({ business, points: [point] }); });
  expect(screen.getByLabelText("URL del punto")).toHaveValue(window.location.origin + "/p/new");
  expect(screen.getByRole("button", { name: /Mesa 3.*Pagado/ })).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.getByRole("button", { name: /Barra.*Pendiente/ })).toHaveAttribute("aria-pressed", "true");
});
