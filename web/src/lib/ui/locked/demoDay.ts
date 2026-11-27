// demo_data: copied from app/fixtures/demo_day.json (jornada de Tacos de Doña Rosa). Not real sales.
export const demoDay = {
  demo_data: true,
  business: "Tacos de Doña Rosa",
  zone: "Tianguis · Pasillo de comida",
  orders: [
    { id: "demo-order-1", amount_cents: 10000, status: "paid", concept: "Orden de tacos", time: "10:01" },
    { id: "demo-order-2", amount_cents: 10000, status: "paid", concept: "Orden de tacos", time: "11:01" },
    { id: "demo-order-3", amount_cents: 10000, status: "pending", concept: "Orden de tacos", time: "12:00" },
  ],
  expenses: [
    { id: "demo-expense-1", amount_cents: 12000, category: "Insumos", description: "Costo variable de dos órdenes" },
    { id: "demo-expense-2", amount_cents: 2000, category: "Puesto", description: "Cuota diaria" },
  ],
} as const;

export const mxn = (cents: number) =>
  (cents / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).replace("MXN", "").trim();
