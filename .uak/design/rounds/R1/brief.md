# Brief · Negosocios · landing

The same for every variant: content comes from here, only the design changes. A beat marked MISSING is not
written on the page and not made up; the human fills IDEA.md and a new round picks it up.

- **The one line (§1):** Ventaja frente a otros equipos (ganadores previos: Varísimo = cobros por WhatsApp, Abarpay = POS para tienditas, Barrio = pedidos por voz): no es sólo un QR de cobro; junta cobro verificable + finanzas explicadas (cálculos con reglas, no inventados por la IA) + red de comercios locales con promociones que respetan una contribución mínima.
- **Proof number, with its source (§10):** CoDi requiere internet y cuenta bancaria; operaciones sin comisión (source: https://www.codi.org.mx/secundarias/preguntas_frecuentes.html)
- **The wow (§4):** el cliente paga desde su celular y en menos de 3 s el puesto recibe la confirmación verificada y el cierre del día se actualiza solo
- **How it works, steps (§4):**
  1. Comerciante da de alta su puesto (nombre, giro, zona) -> Perfil público + QR del punto
  2. Comerciante crea un cobro (importe + concepto) -> QR dinámico de la orden, estado "pendiente"
  3. Cliente escanea el QR (o toca el sticker NFC) y autoriza -> Receptor, importe y beneficio antes de pagar; luego **Wow:** el teléfono del comerciante suena con "Pagado 100 MXN" y ambos tienen comprobante
  4. Comerciante dicta "gasté 350 en tortillas" -> Campos estructurados (importe, categoría, fecha) para confirmar o corregir
  5. Comerciante abre el cierre del día -> Ventas confirmadas, gastos, utilidad estimada, pendientes y diferencias, con datos faltantes señalados
  6. Comerciante simula una promoción -> Descuento máximo que conserva su contribución mínima, con la fórmula explicada; activa con tope de presupuesto
- **Who it is for (§2):** Doña Rosa, puesto de tacos en tianguis: Cobrar rápido y saber que el pago llegó; Luis, cliente sin efectivo: Encontrar dónde pagar con el celular y ver a quién paga; Doña Rosa al cerrar: Registrar gastos sin escribir y saber cuánto ganó; Doña Rosa planeando: Saber qué promoción puede pagar sin perder
- **The ask (`Ask:` line in IDEA.md):** MISSING (not in IDEA.md)

## Brand colors (from the project)
The project already has these colors (CSS custom properties). The color gene starts from them: use them as the palette's anchors, not a new palette.

- #EDE6FF (CSS custom properties)
- #1B1030 (CSS custom properties)
- #5B4F73 (CSS custom properties)
- #D9CFF0 (CSS custom properties)
- #7E14FF (CSS custom properties)
- #863BFF (CSS custom properties)

## Material the project has

- illustration: web/public/favicon.svg, web/public/icons.svg
- product screenshot: web/ (the running app)

## Subject world
The agent building each variant lists 3-5 concrete things from this project's domain (its objects, instruments, units,
local vernacular) at the top of index.html in a comment, and uses at least one as a visual element (a shape, an
icon, a unit on a number, a word on a label). Not decoration from the genre: things the people in IDEA.md touch.
