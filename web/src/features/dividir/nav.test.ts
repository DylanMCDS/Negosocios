import { expect, it } from "vitest";
import { nav } from "./nav";

it("dividir_is_reachable_from_the_menu_in_the_clientes_group", () => {
  expect((nav as { hidden?: boolean }).hidden).not.toBe(true);
  expect(nav.group).toBe("clientes");
  expect(nav.label).toBe("Dividir");
});
