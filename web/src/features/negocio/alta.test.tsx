import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import Negocio from "./index";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

it("alta_fields_show_examples", () => {
  render(<Negocio />);
  expect(screen.getByLabelText("Giro")).toHaveAttribute("placeholder", "Ej. Tacos, Barbería, Abarrotes");
  expect(screen.getByLabelText("Zona")).toHaveAttribute("placeholder", "Ej. Tianguis de Santa Cruz, Iztapalapa");
  expect(screen.getByText(/zona es aproximada, no la dirección exacta/i)).toBeInTheDocument();
});
