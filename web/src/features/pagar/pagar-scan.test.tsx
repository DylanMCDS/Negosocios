import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Pagar from "./index";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

it("pagar_without_order_id_asks_to_scan_qr", () => {
  render(<Pagar />);
  expect(screen.getByText("Escanea el QR del puesto para pagar")).toBeInTheDocument();
  expect(screen.queryByText("No encontramos este cobro")).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
