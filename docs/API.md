# Contrato HTTP de Negosocios

Contrato compartido para implementar HACK-006/007/008/013. Describe el comportamiento
acordado; HACK-002 entrega esquemas, no rutas ejecutables. La verificación de las
rutas corresponde a sus tareas. Los modelos están en `app/schemas/__init__.py` y
los tipos JSON en `web/src/lib/types.ts`.

Todos los importes son enteros en centavos, nunca números decimales ni cadenas;
`currency` sólo admite `MXN`. Los importes de cobros y gastos son positivos; los
totales son no negativos salvo `estimated_profit_cents`, que admite pérdidas.
Fechas: ISO 8601; las fechas de gasto son `YYYY-MM-DD`. El cierre usa
America/Mexico_City. Campos desconocidos se rechazan. Los modelos de respuesta
se serializan en modo JSON con sus defaults incluidos. En solicitudes, los
campos con default se pueden omitir; en respuestas se incluyen incluso si son
`null`. En CampaignSimulation, los campos nullable son requeridos.

## POST /api/businesses

Request: `{"name":"Tacos de Doña Rosa","category":"Tacos","zone":"Tianguis"}`.
Opcionales: `temporary_location: string|null`, `location_expires_at: datetime|null`.
El servidor asigna `id` y la marca `demo_data` (false para datos reales).
Response 201: `Business` con los campos anteriores, `id`, `demo_data` y los dos
campos de ubicación (null por defecto). `GET /api/businesses/{id}` devuelve el
mismo modelo con 200, o 404 si no existe.

## POST /api/orders

Header obligatorio: `Idempotency-Key: <valor único por negocio>`.
Request (`OrderCreate`):
`{"business_id":"rosa","amount_cents":10000,"concept":"Orden de tacos","currency":"MXN"}`.
Concepto de 1 a 40 caracteres; currency tiene default MXN.
Response 201: `Order`, con id, status `pending`, idempotency_key, codi_qr_id,
qr_string, created_at y expires_at (600 segundos); paid_at es null,
reconciliation_required es false, reconciliation_reason es null, demo_data es
false para cobros reales. Una repetición idéntica de la clave devuelve la misma
orden, 200, sin generar otro QR. Clave reutilizada con otro payload: 409.
Negocio inexistente: 404; proveedor no disponible: 502 sin orden pendiente huérfana.

## GET /api/orders/{id}

Request sin cuerpo; id identifica una orden.
Response 200: `{"order": Order, "business": Business}`; el negocio asociado es
el receptor que se muestra antes de pagar. Order incluye importe, moneda,
concepto, QR y estado (`pending|paid|expired|failed`). Desconocida: 404.

## POST /api/payments/{id}/confirm

Request sin cuerpo; `{id}` es el id de la orden. Compatibilidad con el flujo de
IDEA.md: consulta la confirmación guardada, no autoriza ni registra un pago
declarado por el cliente. Response 200:
`{"order": Order, "payment": Payment|null}`. Sin webhook confirmado, payment
es null y el estado no cambia. Orden desconocida: 404. La implementación de
esta ruta está pendiente de asignación; los consumidores pueden usar GET de orden.

## POST /api/expenses/voice

Request JSON: `{"business_id":"rosa","transcript":"gasté 350 en tortillas"}`.
Response 200: `{"draft": ExpenseCreate|null, "needs_confirmation":true,
"missing":string[]}`. La interpretación sólo produce un borrador editable;
si falta importe/categoría/fecha, draft es null y missing enumera lo faltante.
Nada se persiste sin confirmación. HACK-013 implementa la interpretación.

`POST /api/expenses`: confirma un gasto manual o dictado con ExpenseCreate:
`{"business_id":"rosa","amount_cents":35000,"category":"Insumos",
"date":"2026-11-26","source":"voice","description":"Tortillas","currency":"MXN"}`.
source tiene default manual; description tiene default vacío; currency MXN.
Response 201: Expense (mismos campos, id y demo_data). Negocio desconocido: 404.

## GET /api/closing/today

Request sin cuerpo; query obligatorio `business_id=rosa`.
Response 200: Closing: currency, confirmed_sales_cents, expenses_cents,
estimated_profit_cents, pending (Order[]), pending_cents, missing (string[]).
Sólo órdenes paid del día suman ventas confirmadas; los pendientes se reportan
aparte. Missing lista datos faltantes para que la utilidad se muestre estimada.
Negocio desconocido: 404. No recibir business_id: 422.

## POST /api/campaigns/simulate

Request: `{"price_cents":10000,"variable_cost_cents":6000,
"min_contribution_cents":3000,"budget_cents":10000,"currency":"MXN"}`.
Precio positivo; otros importes no negativos. Response 200: CampaignSimulation:
currency, ok, max_discount_pct (porcentaje 0–100 o null), message (string|null),
formula, budget_cents, max_uses (entero no negativo|null).
Fórmula: `100 * (1 - (variable_cost_cents + min_contribution_cents) / price_cents)`.
Ejemplo simulado 100/60/30: 10 % máximo. Si no existe descuento viable,
ok es false y message explica por qué; max_discount_pct y max_uses son null.
Sin descuento positivo, los usos no se calculan por división entre cero.

## POST /api/webhooks/pey

Request: cuerpo crudo y headers Standard Webhooks. Ver `docs/PEY.md` para el
contrato del proveedor. Sólo un `codi.qr.payment_received` firmado puede crear
Payment y cambiar Order a paid. El adaptador traduce codiQrId/transactionId a
codi_qr_id/transaction_id. Firma inválida: 401 sin cambios. Response 200:
`{"ok":true}` también para duplicados y QR desconocidos; guardar webhook_id
incluso en esos casos. Monto distinto: conservar estado, marcar
reconciliation_required y reconciliation_reason, sin confirmar el pago.
El servicio procesa evento, Payment y transición de orden en una transacción;
init_db sólo crea restricciones, no ejecuta esta lógica.

## POST /api/demo/seed

Request sin cuerpo; carga la jornada de `app/fixtures/demo_day.json`.
Response 200: `{"demo_data":true,"business_id":"rosa"}`. Todos los registros
simulados conservan demo_data true. La fixture contiene dos ventas pagadas de
100 MXN, una pendiente y gastos por 140 MXN: la utilidad estimada es 60 MXN.

## Errores y persistencia

Validación 422 usa `{"detail":[...]}` de Pydantic/FastAPI. Errores de dominio
usan `{"detail":"mensaje legible"}` con 404/409/502 según lo descrito.
El scoping de consultas requiere business_id donde está indicado; este contrato
de prototipo no define un sistema de autenticación.

`connect(path)` activa foreign_keys y sqlite3.Row. `init_db(conn)` crea tablas
businesses, orders, payments, expenses y webhook_events de forma idempotente.
Ejecutarlo al arrancar, antes de transacciones: executescript puede hacer commit.
El caller gestiona commit/rollback. webhook_id y transaction_id son únicos;
orders impone unicidad de (business_id, idempotency_key). No se incluyen clientes
externos, conciliación ni lógica de negocio en estos helpers.
