# TASKS · Negosocios · backlog v1 (prototipo, 2026-11-26 → 2026-11-29 23:59 America/Mexico_City)

State lives on the `claims` branch (`uak status`); this file holds only tasks. Check the graph with `uak graph`.
Stack: FastAPI + React (`.uak/stacks/fastapi-react/STACK.md`). Producto: `IDEA.md`. API de pey: `docs/PEY.md` (cobro REAL; en tests, Fake).
Rubric: C1 Uso de CoDi/pey 30 · C2 Impacto 25 · C3 Ejecución técnica 15 · C4 Experiencia y diseño 15 · C5 Originalidad 15.

Format rules (the CLI parses them):
- `Depends on:` real IDs separated by commas, or `None`. It blocks the claim until they are INTEGRATED. Text in parentheses is ignored.
- `Uses contract:` soft dependency. It never blocks; it routes contract notices. Work against the mock.
- `Paths:` relative paths separated by commas; directories end in `/`. Reserve everything you will touch.
- `Verify:` one exact command that exits 0 when the task is done.
- `Estimate:` minutes or hours, used for the critical path.
- `Tests:` the behaviors as test names, separated by commas: the spec. `uak red ID` sees them fail first; `done` checks each exists. A task with nothing to test first: `Test-First: no (why)`.

## HACK-001 · Esqueleto FastAPI + React que se despliega

- **Type:** setup
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C3 · `.uak/stacks/fastapi-react/STACK.md`
- **Depends on:** None
- **Paths:** pyproject.toml, uv.lock, .python-version, app/__init__.py, app/main.py, app/config.py, app/routers/__init__.py, app/routers/health.py, app/services/__init__.py, app/tests/__init__.py, app/tests/conftest.py, app/tests/test_health.py, web/package.json, web/package-lock.json, web/index.html, web/vite.config.ts, web/vitest.config.ts, web/tsconfig.json, web/tsconfig.node.json, web/src/main.tsx, web/src/App.tsx, web/src/lib/api.ts, web/src/test/, Dockerfile, .dockerignore, render.yaml
- **Freeze-Allowed:** no
- **Acceptance:**
  - Sigue `.uak/stacks/fastapi-react/STACK.md`: `app/main.py` auto-descubre routers y sirve `web/dist`; `web/src/App.tsx` auto-descubre `web/src/features/*/index.tsx`.
  - Todas las dependencias previsibles de una vez. Backend: fastapi, uvicorn[standard], pydantic-settings, httpx, standardwebhooks, tzdata; dev: pytest, ruff, playwright. Web: react-router-dom, qrcode (QR desde `qrString`), vitest, @testing-library/react, @testing-library/user-event, jsdom, Tailwind v4, motion.
  - `app/config.py` lee `PEY_API_KEY`, `PEY_WEBHOOK_SECRET`, `DATABASE_PATH` (default `data/negosocios.db`) y `PUBLIC_BASE_URL` del entorno; nunca lee `.env` en código cliente.
  - `bash .uak/bin/uak deploy --write` crea `Dockerfile`, `.dockerignore` y `render.yaml` (Render, un servicio, health `/api/health`, variables de `.env.example` con `sync: false`).
  - `npm --prefix web test -- --run` corre (aunque no haya tests de features todavía).
- **Tests:** health_returns_ok, serves_web_index_at_root
- **Verify:** `uv run pytest -q app/tests/test_health.py && npm --prefix web ci && npm --prefix web run build`
- **Next step:** `uv init --bare --name app --python 3.12 --pin-python .` y copiar `app/main.py` de STACK.md.

## HACK-002 · Contrato: esquemas, base de datos y datos de demo

- **Type:** contract
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C3 · `IDEA.md` §6
- **Depends on:** None
- **Paths:** app/schemas/, app/db.py, app/fixtures/, app/tests/test_schemas.py, web/src/lib/types.ts, docs/API.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - Modelos pydantic en `app/schemas/`: Business, OrderCreate, Order (status `pending|paid|expired|failed`), Payment, ExpenseCreate, Expense, Closing, CampaignSimulation. Montos en centavos (`int`) y moneda `MXN` explícita.
  - `app/db.py` (sqlite3 de stdlib): `connect(path)`, `init_db(conn)` con tablas businesses, orders, payments, expenses, webhook_events (`webhook_id` UNIQUE); sólo esquema y helpers, sin lógica de negocio.
  - `app/fixtures/demo_day.json`: el puesto de tacos de Doña Rosa con una jornada de ventas y gastos (precio 100 MXN, costo variable 60 MXN), marcada como `demo_data`.
  - `web/src/lib/types.ts` refleja los esquemas; `docs/API.md` lista cada endpoint de `IDEA.md` §4 con request/response.
- **Tests:** order_create_rejects_zero_or_negative_amount, concept_longer_than_40_chars_is_rejected, demo_fixture_validates_against_schemas, init_db_creates_unique_webhook_id
- **Verify:** `uv run --no-project --with pytest --with pydantic pytest -q app/tests/test_schemas.py`
- **Next step:** escribir `app/tests/test_schemas.py` con los 4 nombres y `uak red HACK-002`.

## HACK-003 · Cliente de pey y verificación de webhooks (con Fake)

- **Type:** spike
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C3 · `docs/PEY.md`
- **Depends on:** None
- **Paths:** app/services/pey.py, app/services/pey_webhook.py, app/tests/test_pey.py, scripts/pey_smoke.py, docs/PEY.md
- **Freeze-Allowed:** no
- **Acceptance:**
  - `PeyClient` (Protocol) con `create_qr(amount_mxn, concept, num_ref, expiration_s) -> QrResult(id, qr_string)`; `HttpPeyClient` (httpx, `POST https://api.pey.mx/codi/qr`, Bearer) y `FakePeyClient` para tests.
  - Errores de pey (`400/429/500/503` con `error.type` y `requestId`) se convierten en excepciones tipadas; 429 → `PeyRateLimited`.
  - `verify_webhook(raw_body, headers, secret)` con la librería `standardwebhooks`; devuelve el evento o lanza `InvalidSignature`.
  - `scripts/pey_smoke.py` crea UN QR real de 1 MXN con la llave del entorno e imprime sólo `id` (lo corre el humano; no se usa en tests ni en CI).
  - Ningún test llama a la API real.
- **Tests:** creates_qr_with_amount_concept_and_expiration, sends_bearer_key_from_config, maps_429_to_rate_limited_error, verifies_valid_webhook_signature, rejects_tampered_webhook_body
- **Verify:** `uv run --no-project --with pytest --with httpx --with standardwebhooks pytest -q app/tests/test_pey.py`
- **Next step:** leer `docs/PEY.md`, escribir los tests con `httpx.MockTransport` y `uak red HACK-003`.

## HACK-004 · Motor de finanzas: cierre del día y descuento máximo

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C2, C5 · `docs/CONTEXTO-CoDi.md` §8, §9.1
- **Depends on:** None
- **Uses contract:** HACK-002
- **Paths:** app/services/finance.py, app/tests/test_finance.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - Funciones puras (stdlib), montos en centavos: `max_discount(price, variable_cost, min_contribution)` = `1 − (costo + contribución) / precio`; `closing(sales, expenses)` → ventas confirmadas, gastos, utilidad estimada, pendientes y `missing` (qué datos faltan).
  - Precio 100, costo 60, contribución mínima 30 → 10 %. Un resultado negativo se reporta como "el precio actual ya incumple la meta", nunca como descuento.
  - El cierre sólo cuenta órdenes `paid`; las `pending` aparecen aparte.
- **Tests:** max_discount_keeps_min_contribution, max_discount_reports_price_already_below_target, closing_counts_only_paid_orders, closing_lists_pending_orders_separately, closing_flags_missing_costs
- **Verify:** `uv run --no-project --with pytest pytest -q app/tests/test_finance.py`
- **Next step:** escribir `test_max_discount_keeps_min_contribution` con el ejemplo 100/60/30 y `uak red HACK-004`.

## HACK-005 · Bloqueo de diseño (design lock)

- **Type:** setup
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C4
- **Depends on:** HACK-001
- **Paths:** web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/src/App.tsx, web/public/design-lock/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Correr `/uak-design-lock`: direcciones visuales con capturas, Dylan elige una, luego shell, UI kit y 3 pantallas bloqueadas (Cobrar, Pagar, Cierre del día).
  - `web/DESIGN.md` tiene la tabla de pantallas con `Recipe` y `Hero` para cada feature: cobrar, pagar, cierre, negocio, voz, landing.
  - Controles grandes, alto contraste y textos breves (`docs/CONTEXTO-CoDi.md` §10.8); UI en español.
- **Test-First:** no (diseño visual elegido por el humano desde capturas)
- **Verify:** `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && bash .uak/bin/uak lint`
- **Next step:** `/uak-design-lock` con referencias de `IDEA.md` §0.

## HACK-006 · Negocios y órdenes de cobro con QR CoDi real

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1 · `IDEA.md` §4 pasos 1–2 · `docs/PEY.md`
- **Depends on:** HACK-001, HACK-002, HACK-003
- **Paths:** app/routers/businesses.py, app/routers/orders.py, app/services/orders.py, app/tests/test_orders.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - `POST /api/businesses` crea el puesto; `GET /api/businesses/{id}` devuelve el perfil público.
  - `POST /api/orders` (`business_id`, `amount_cents`, `concept`, `Idempotency-Key`) llama a `PeyClient.create_qr` con expiración 600 s y `numRef` numérico de la orden; guarda `codi_qr_id` y `qr_string`; responde `pending`.
  - Repetir la misma `Idempotency-Key` devuelve la misma orden sin crear otro QR.
  - `GET /api/orders/{id}` devuelve estado, importe, concepto, receptor y `qr_string` (para la página de pago).
  - Si pey falla, no queda orden `pending` huérfana y el error es legible.
- **Tests:** creates_order_with_codi_qr_from_pey, same_idempotency_key_returns_same_order, rejects_zero_or_negative_amount, does_not_create_order_when_pey_fails, returns_404_for_unknown_order
- **Verify:** `uv run pytest -q app/tests/test_orders.py`
- **Next step:** fixture con `FakePeyClient` inyectado por dependencia de FastAPI.

## HACK-007 · Webhook de pey marca la orden como pagada

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C3 · `docs/PEY.md` §Webhooks
- **Depends on:** HACK-006
- **Paths:** app/routers/webhooks.py, app/services/payments.py, app/tests/test_webhooks.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - `POST /api/webhooks/pey` lee el cuerpo crudo, verifica la firma con `PEY_WEBHOOK_SECRET` y procesa `codi.qr.payment_received`: busca la orden por `codiQrId`, guarda Payment (`transactionId`, monto) y la marca `paid`.
  - Firma inválida → 401 y nada cambia. `webhook-id` repetido → 200 sin doble registro.
  - Pago de un QR desconocido → 200, se registra en webhook_events y no toca órdenes.
  - Monto pagado distinto del de la orden → la orden queda marcada para aclaración, no `paid`.
- **Tests:** marks_order_paid_on_valid_qr_webhook, rejects_webhook_with_bad_signature, duplicate_webhook_id_is_processed_once, ignores_payment_for_unknown_qr, amount_mismatch_is_flagged_not_paid
- **Verify:** `uv run pytest -q app/tests/test_webhooks.py`
- **Next step:** firmar payloads de prueba con `standardwebhooks.Webhook(secret).sign(...)`.

## HACK-008 · API de gastos, cierre del día y simulador de promoción

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C2, C5 · `IDEA.md` §4 pasos 5–6
- **Depends on:** HACK-001, HACK-002, HACK-004
- **Paths:** app/routers/expenses.py, app/routers/closing.py, app/routers/campaigns.py, app/services/expenses.py, app/tests/test_closing.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - `POST /api/expenses` registra un gasto manual; `GET /api/closing/today?business_id=` usa `finance.closing` con órdenes y gastos del día (zona America/Mexico_City).
  - `POST /api/campaigns/simulate` (precio, costo variable, contribución mínima, presupuesto) devuelve el descuento máximo, la fórmula y cuántos usos alcanza el presupuesto.
  - `POST /api/demo/seed` carga `app/fixtures/demo_day.json` para la demo.
- **Tests:** records_manual_expense, closing_today_includes_paid_sales_and_expenses, closing_today_excludes_pending_orders, simulate_campaign_returns_max_discount_and_uses, seed_loads_demo_day
- **Verify:** `uv run pytest -q app/tests/test_closing.py`
- **Next step:** insertar órdenes `paid` y `pending` directo con `app/db.py` en el test.

## HACK-009 · Pantalla Cobrar: el comerciante genera el QR y ve "Pagado"

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C4 · `IDEA.md` §4 pasos 2–3 (el wow)
- **Depends on:** HACK-005, HACK-006
- **Uses contract:** HACK-007
- **Paths:** web/src/features/cobrar/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Recipe: flow · Hero: el QR CoDi grande con el importe (fila de `web/DESIGN.md`).
  - Teclado numérico grande → importe + concepto → "Cobrar" → QR renderizado desde `qr_string` y enlace/QR a la página de pago.
  - Consulta `GET /api/orders/{id}` cada 2 s; al pasar a `paid` muestra "Pagado $100.00" con sonido y vibración, en menos de 3 s desde el webhook.
  - Error de pey → mensaje claro y botón reintentar con la misma `Idempotency-Key`.
- **Tests:** shows_qr_after_creating_charge, shows_paid_when_order_becomes_paid, shows_retry_when_charge_fails
- **Verify:** `npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
- **Next step:** mock de `fetch` en vitest con las respuestas de `docs/API.md`.

## HACK-010 · Página de pago del cliente (QR, enlace y sticker NFC)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C4 · `IDEA.md` §4 paso 3 · `docs/CONTEXTO-CoDi.md` §7
- **Depends on:** HACK-005, HACK-006
- **Uses contract:** HACK-007
- **Paths:** web/src/features/pagar/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Recipe: detail · Hero: receptor + importe antes de pagar.
  - Ruta pública `/pagar/:orderId` (la abre el QR del puesto o un sticker NFC): muestra nombre del puesto, importe, concepto y el QR CoDi para escanear con la app bancaria, sin registro.
  - Al pasar a `paid` muestra el comprobante (importe, receptor, fecha, `transactionId`). Orden `expired` → mensaje y aviso de pedir otro cobro.
- **Tests:** shows_receiver_and_amount_before_paying, shows_receipt_when_paid, shows_expired_message
- **Verify:** `npm --prefix web test -- --run src/features/pagar && npm --prefix web run build`
- **Next step:** componente `PayPage` que lee `orderId` de la ruta.

## HACK-011 · Pantalla Cierre del día y simulador de promoción

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C2, C5 · `IDEA.md` §4 pasos 5–6
- **Depends on:** HACK-005, HACK-008
- **Paths:** web/src/features/cierre/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Recipe: dashboard · Hero: utilidad estimada del día.
  - Ventas cobradas por CoDi, gastos, utilidad estimada, cobros pendientes y "datos faltantes" en lenguaje simple.
  - Simulador: precio, costo y ganancia mínima → "Puedes dar hasta 10 % de descuento" con la cuenta visible; presupuesto → cuántos usos alcanza.
- **Tests:** shows_profit_from_closing_api, shows_missing_data_warning, simulator_shows_max_discount
- **Verify:** `npm --prefix web test -- --run src/features/cierre && npm --prefix web run build`
- **Next step:** mock de `/api/closing/today` con los números de `app/fixtures/demo_day.json`.

## HACK-012 · Alta del puesto y perfil público

- **Type:** feature
- **Priority:** P1
- **Estimate:** 45 min
- **Rubric / Spec:** C2, C4 · `IDEA.md` §4 paso 1
- **Depends on:** HACK-005, HACK-006
- **Paths:** web/src/features/negocio/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Recipe: flow · Hero: el QR fijo del puesto para imprimir.
  - Alta en 3 campos (nombre, giro, zona) con consentimiento explícito; perfil público con horario y "Paga aquí con CoDi".
- **Tests:** creates_business_with_three_fields, requires_consent_before_saving, shows_public_profile
- **Verify:** `npm --prefix web test -- --run src/features/negocio && npm --prefix web run build`
- **Next step:** formulario con los 3 campos y `POST /api/businesses`.

## HACK-013 · Registrar gasto por voz

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C2 · `docs/CONTEXTO-CoDi.md` §10.1
- **Depends on:** HACK-005, HACK-008
- **Paths:** app/services/voice_parse.py, app/routers/voice.py, app/tests/test_voice.py, web/src/features/voz/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Recipe: flow · Hero: los campos detectados para confirmar.
  - El navegador transcribe con Web Speech API (es-MX); `POST /api/expenses/parse` convierte "gasté 350 en tortillas" en `{amount_cents: 35000, category: "insumos", description: "tortillas"}` con reglas (sin LLM: el número nunca lo inventa un modelo).
  - Nada se guarda sin confirmar; campos editables; importe ambiguo → se pide corregir. Si el navegador no soporta voz, captura manual equivalente.
- **Tests:** parses_amount_and_item_from_spanish_phrase, parses_amount_written_with_pesos_word, flags_ambiguous_amount, does_not_save_without_confirmation
- **Verify:** `uv run pytest -q app/tests/test_voice.py && npm --prefix web test -- --run src/features/voz && npm --prefix web run build`
- **Next step:** tabla de frases de ejemplo en `test_voice.py`.

## HACK-014 · Landing de Negosocios

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C2, C4 · skill `landing-story`
- **Depends on:** HACK-005, HACK-009, HACK-011
- **Paths:** web/src/features/landing/, web/public/landing/
- **Freeze-Allowed:** yes
- **Acceptance:**
  - Recipe: landing · Hero: captura real de "Pagado" en la pantalla Cobrar.
  - Una línea de `IDEA.md` §1, un dato con fuente, el wow como pantalla real, tres pasos y la invitación a probar la demo. Menciona que "usa CoDi y la API de pey" sin presentarse como producto oficial.
- **Tests:** shows_one_line_and_cta, cta_links_to_cobrar
- **Verify:** `npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint`
- **Next step:** `/landing-story` con `IDEA.md`.

## HACK-015 · Producción: deploy, webhook real y smoke del producto

- **Type:** integration
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C3 · `docs/PEY.md` · reglas §6.3 (ambiente productivo)
- **Depends on:** HACK-007, HACK-009, HACK-010
- **Paths:** .uak/bin/smoke-project, .uak/bin/.smoke-project.provenance, docs/DEPLOY.md
- **Freeze-Allowed:** yes
- **Acceptance:**
  - `bash .uak/bin/uak init-smoke` arranca la app y pide `/api/health`; se commitean `smoke-project` y su provenance.
  - `docs/DEPLOY.md`: pasos para Dylan (crear el servicio en Render desde `render.yaml`, poner `PEY_API_KEY`/`PEY_WEBHOOK_SECRET` en Render, registrar `https://<app>/api/webhooks/pey` en portal.pey.mx, poner `Live-URL` en PROJECT.md).
  - Un cobro real de 1 MXN en producción pasa a "Pagado" en Cobrar y en Pagar; la evidencia (captura + `webhook-id` del log de pey) queda en el PR.
- **Test-First:** no (configuración de despliegue y prueba manual con dinero real)
- **Verify:** `bash .uak/bin/smoke-project`
- **Next step:** `bash .uak/bin/uak deploy` para ver lo que falta.

## HACK-016 · Video de demo y materiales de entrega

- **Type:** demo
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1–C5 · reglas §10.1
- **Depends on:** HACK-014, HACK-015
- **Paths:** docs/SUBMISSION.md, docs/DEMO.md
- **Freeze-Allowed:** yes
- **Acceptance:**
  - `docs/SUBMISSION.md`: descripción ≤ 500 palabras que dice explícitamente cómo usa el API de pey; instrucciones de prueba ≤ 1000 palabras; declaración de componentes previos y de terceros; integrantes.
  - `docs/DEMO.md`: guion del video ≤ 3 min que muestra un cobro CoDi desde el QR hasta la reacción al webhook; plan B (video grabado).
- **Test-First:** no (documentos de entrega)
- **Verify:** `test $(wc -w < docs/SUBMISSION.md) -le 1600 && grep -qi 'pey' docs/SUBMISSION.md && test -s docs/DEMO.md`
- **Next step:** `/uak-demo`.
