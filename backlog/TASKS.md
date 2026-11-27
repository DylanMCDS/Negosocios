# Backlog published on claims (uak plan)

Append-only; added to .uak/TASKS.md from main. Why: adding tasks never waits for a PR.
## HACK-017 · Parser de gasto por voz (backend)

- **Type:** feature
- **Priority:** P1
- **Estimate:** 40 min
- **Rubric / Spec:** C5, C2 · `docs/CONTEXTO-CoDi.md` §10.1
- **Depends on:** HACK-008
- **Paths:** app/services/voice_parse.py, app/routers/voice.py, app/tests/test_voice.py
- **Freeze-Allowed:** no
- **Acceptance:** `POST /api/expenses/parse` recibe el texto transcrito y devuelve `{amount_cents, category, description, ambiguous}` con reglas (sin LLM): "gasté 350 en tortillas" → 35000, "insumos", "tortillas"., Entiende "350 pesos", "$350", "trescientos cincuenta" (al menos centenas y decenas comunes) y decimales "35.50"., Importe ausente o con dos números → `ambiguous: true`; nunca guarda: sólo propone. Guardar sigue siendo `POST /api/expenses` (HACK-008)., La parte de UI queda para HACK-013, que reutiliza este endpoint.
- **Tests:** parses_amount_and_item_from_spanish_phrase, parses_amount_written_with_pesos_word, parses_amount_in_words, flags_ambiguous_amount, parse_endpoint_does_not_save_expense
- **Verify:** `uv run pytest -q app/tests/test_voice.py`
- **Next step:** tabla de frases de ejemplo en `app/tests/test_voice.py` y `uak red HACK-017`.

## HACK-018 · Cierre: la línea Cuenta mezcla pesos y % (200 − (100+50) = 25 %); mostrar 200 − 150 = 50 (25 % del precio) y tomar business_id del alta (follow-up of HACK-011)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HACK-011
- **Follow-up of:** HACK-011
- **Paths:** web/src/features/cierre/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Cierre: la línea Cuenta mezcla pesos y % (200 − (100+50) = 25 %); mostrar 200 − 150 = 50 (25 % del precio) y tomar business_id del alta
- **Verify:** `npm --prefix web test -- --run src/features/cierre && npm --prefix web run build`
## HACK-019 · El puesto demo existe siempre al arrancar (bug en producción)

- **Type:** bug
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C1, C3 · reportado en Render 2026-11-26
- **Depends on:** HACK-008
- **Paths:** app/services/bootstrap.py, app/routers/bootstrap.py, app/tests/test_bootstrap.py
- **Freeze-Allowed:** yes
- **Acceptance:** Bug: en Render la base SQLite se borra en cada deploy; la pantalla Cobrar usa el negocio `rosa` y `POST /api/orders` responde 404 "Negocio no encontrado" → "No pudimos crear el cobro"., Al arrancar la app (evento de startup en un router auto-descubierto; `app/main.py` no se toca), si no existe el negocio `rosa`, se crea desde `app/fixtures/demo_day.json` (sólo el negocio; las ventas y gastos demo siguen en `POST /api/demo/seed`)., Idempotente: arrancar dos veces no duplica ni pisa datos existentes.
- **Tests:** creating_order_for_demo_business_works_on_empty_database, startup_does_not_duplicate_existing_business
- **Verify:** `uv run pytest -q app/tests/test_bootstrap.py`
- **Next step:** reproducir con TestClient sobre una base vacía: `POST /api/orders` con `business_id=rosa` da 404.
## HACK-020 · El webhook real de pey no marca la orden pagada (payload plano)

- **Type:** bug
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C1 · https://docs.pey.mx/en/docs/webhooks/codi/qr/ · cobro real de 1 MXN en Render 2026-11-26
- **Depends on:** HACK-007
- **Paths:** app/services/payments.py, app/tests/test_webhooks.py, app/tests/test_payments_real_payload.py, docs/PEY.md
- **Freeze-Allowed:** yes
- **Acceptance:** Bug: Dylan pagó 1 MXN real; pey envió `codi.qr.payment_received` y la orden siguió `pending`. Causa: `process_event` lee `event["data"]["codiQrId"]`, pero el payload real de pey es PLANO: `{"type","amount","codiQrId","transactionId","numRef","concept","datePaid","apiKeyId","metadata"}` sin `data`., `process_event` lee los campos del nivel superior del evento (aceptar también `data` anidado sólo como compatibilidad). `amount` viene en pesos (número, p. ej. `1` o `150`) → centavos., Los tests firmados existentes de HACK-007 se corrigen al formato real (el formato `data` anidado nunca existió en pey); se agrega un test con el ejemplo literal de la documentación., Si llega un pago con `codiQrId` desconocido, queda en `webhook_events` con `event_type` y se registra en el log del servidor (sin datos personales) para poder diagnosticarlo., `docs/PEY.md` documenta el payload real.
- **Tests:** marks_order_paid_with_real_flat_pey_payload, real_payload_amount_in_pesos_converts_to_cents, logs_unknown_qr_payment_for_diagnosis
- **Verify:** `uv run pytest -q app/tests/test_webhooks.py app/tests/test_payments_real_payload.py`
- **Next step:** copiar el ejemplo JSON de https://docs.pey.mx/en/docs/webhooks/codi/qr/ a un test firmado y ver que falla (`uak red HACK-020`).
## HACK-021 · Navegación clara y Cobrar usa el puesto dado de alta

- **Type:** feature
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C4, C2 · revisión de Dylan en producción 2026-11-26
- **Depends on:** HACK-012
- **Paths:** web/src/App.tsx, web/src/features/pagar/, web/src/features/negocio/, web/src/features/cobrar/, web/src/lib/business.ts
- **Freeze-Allowed:** yes
- **Acceptance:** Recipe: flow · Hero: el puesto activo visible en Cobrar., Menú: "Inicio" primero; "Pagar" sale del menú del comerciante (es la pantalla del cliente y sólo se abre desde el QR/enlace `/pagar/<id>`). Abrir Pagar sin id muestra "Escanea el QR del puesto para pagar" en lugar de "No encontramos este cobro"., Alta del puesto: placeholders con ejemplos ("Ej. Tacos, Barbería, Abarrotes" en Giro; "Ej. Tianguis de Santa Cruz, Iztapalapa" en Zona) y una línea de ayuda: la zona es aproximada, no la dirección exacta., Tras guardar el alta, ese puesto queda como **puesto activo** (`web/src/lib/business.ts`, guardado en localStorage con try/catch) y Cobrar cobra a su nombre; sin puesto guardado o si el puesto ya no existe en el servidor (base reiniciada), usa `rosa`. Cobrar muestra el nombre del puesto activo.
- **Tests:** pagar_without_order_id_asks_to_scan_qr, nav_has_no_pagar_and_starts_with_inicio, alta_fields_show_examples, cobrar_uses_business_saved_by_alta, cobrar_falls_back_to_rosa_when_saved_business_missing
- **Verify:** `npm --prefix web test -- --run src/features/pagar src/features/negocio src/features/cobrar && npm --prefix web run build`
- **Next step:** test rojo de `pagar_without_order_id_asks_to_scan_qr` con la ruta `/pagar` sin id.
## HACK-022 · El menú se arma solo desde las features (comerciante y cliente)

- **Type:** setup
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C4 · idea original: experiencia separada para comerciante y cliente
- **Depends on:** HACK-021
- **Paths:** web/src/App.tsx, web/src/lib/ui/NavBar.tsx, web/src/features/landing/nav.ts, web/src/features/cobrar/nav.ts, web/src/features/cierre/nav.ts, web/src/features/negocio/nav.ts, web/src/features/voz/nav.ts, web/src/features/pagar/nav.ts, web/src/test/nav.test.tsx
- **Freeze-Allowed:** yes
- **Acceptance:** Cada feature declara su entrada en `web/src/features/<f>/nav.ts`: `export const nav = { label, icon, order, group: "negocio" | "clientes" | "inicio", hidden? }`. `App.tsx` descubre `nav.ts` con `import.meta.glob` igual que `index.tsx`; una feature nueva aparece en el menú sin tocar `App.tsx`., El menú muestra dos grupos: **Mi negocio** (Cobrar, Cierre, Voz, Negocio y las que se agreguen) y **Clientes** (Explorar y las que se agreguen). Inicio primero; Pagar sigue oculta., En móvil (390 px) el menú no desborda (scroll horizontal o menú compacto).
- **Tests:** feature_with_nav_file_appears_in_menu, hidden_feature_is_not_in_menu, menu_groups_merchant_and_customer
- **Verify:** `npm --prefix web test -- --run src/test/nav.test.tsx && npm --prefix web run build`
- **Next step:** test rojo con una feature falsa que exporta `nav` y no aparece en el menú.

## HACK-023 · Red de negocios: perfiles con ubicación, horario y verificación (API)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C2, C5 · idea original: mapa con red local de negocios · `docs/CONTEXTO-CoDi.md` §9, §10.5
- **Depends on:** HACK-019
- **Paths:** app/services/network.py, app/routers/network.py, app/fixtures/network_demo.json, app/tests/test_network.py
- **Freeze-Allowed:** no
- **Acceptance:** Tabla propia `network_profiles` creada por el servicio (`CREATE TABLE IF NOT EXISTS`, sin tocar `app/db.py`): business_id, lat, lng aproximados (3 decimales), horario (apertura/cierre por día), acepta CoDi, `verified` (con texto de qué se verificó), ubicación temporal con expiración., `GET /api/network?lat=&lng=&radius_km=&category=&open_now=` devuelve negocios ordenados por distancia con distancia, abierto ahora y rating; la ubicación temporal vencida no se muestra como vigente., `GET /api/network/{business_id}` perfil público; `PUT /api/network/{business_id}` el dueño publica ubicación (exacta o aproximada) y horario., Al arrancar se siembran 8–10 negocios demo alrededor del tianguis de Doña Rosa (`network_demo.json`, `demo_data: true`; fonda, papelería, barbería, frutería, abarrotes…), idempotente.
- **Tests:** lists_businesses_sorted_by_distance, filters_by_category_and_open_now, expired_temporary_location_is_not_current, seeds_demo_network_once
- **Verify:** `uv run pytest -q app/tests/test_network.py`
- **Next step:** fixture de 3 negocios a distancias conocidas y test de orden por distancia.

## HACK-024 · Explorar: mapa de negocios para clientes

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C2, C4 · idea original: el usuario accede a la red de negocios autorizados
- **Depends on:** HACK-022, HACK-023
- **Paths:** web/src/features/explorar/, web/package.json, web/package-lock.json
- **Freeze-Allowed:** no
- **Acceptance:** Recipe: map + panel · Hero: el mapa con los puestos cercanos., Mapa con Leaflet + teselas de OpenStreetMap (sin llave), centrado en el tianguis demo; marcadores por giro; panel con lista ordenada por distancia y filtros (giro, abierto ahora, con promoción de aliado)., Al tocar un negocio: perfil con horario, sello "Verificado: qué se comprobó", estrellas de clientes, "Recomendado por N aliados" (separado de las estrellas) y "Paga aquí con CoDi"., Sin permiso de ubicación o sin red de teselas: la lista funciona sola. `nav.ts` en grupo `clientes`.
- **Tests:** shows_nearby_businesses_from_api, filters_by_category, shows_list_when_map_unavailable
- **Verify:** `npm --prefix web test -- --run src/features/explorar && npm --prefix web run build`
- **Next step:** mock de `/api/network` y test de la lista ordenada.

## HACK-025 · Alianzas entre negocios, referidos y reseñas verificadas (API)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C2 · idea original: alianzas, estrellas, descuentos con aliados sin afectar ganancia · `docs/CONTEXTO-CoDi.md` §9, §9.1, §10.6
- **Depends on:** HACK-023
- **Paths:** app/services/alliances.py, app/routers/alliances.py, app/services/reviews.py, app/routers/reviews.py, app/tests/test_alliances.py, app/tests/test_reviews.py
- **Freeze-Allowed:** no
- **Acceptance:** Tablas propias (creadas por el servicio): alliances (negocio A, negocio B, estado propuesta/activa/cerrada, descuento %, presupuesto, usos, código de referido), referrals (alianza, orden, descuento aplicado), reviews (orden, estrellas 1–5, texto)., Proponer y aceptar alianza; el **descuento de la alianza no puede superar `finance.max_discount`** con el precio, costo y contribución mínima del negocio que lo da (respuesta 422 con la cuenta si lo excede)., `POST /api/alliances/{id}/quote` con importe → importe con descuento, presupuesto restante; el beneficio se reserva una sola vez por orden y respeta presupuesto y usos ante solicitudes simultáneas., Métricas por alianza: referencias, compras pagadas atribuidas, costo de beneficios, contribución estimada (correlación observada, no causalidad)., Reseña sólo de una orden `paid` y una por orden; las alianzas **no** suben las estrellas: el perfil expone por separado `rating`, `reviews_count` y `endorsements` (aliados activos).
- **Tests:** alliance_discount_cannot_exceed_max_discount, quote_respects_budget_and_uses, benefit_applies_once_per_order, review_requires_paid_order, alliances_do_not_raise_star_rating
- **Verify:** `uv run pytest -q app/tests/test_alliances.py app/tests/test_reviews.py`
- **Next step:** test rojo con precio 100, costo 60, contribución 30 y descuento propuesto 15 % → 422.

## HACK-026 · Pantalla Aliados y descuento de aliado al cobrar

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C4 · idea original: incentivar alianzas y dar visibilidad
- **Depends on:** HACK-022, HACK-025
- **Paths:** web/src/features/aliados/, web/src/features/cobrar/
- **Freeze-Allowed:** no
- **Acceptance:** Recipe: list · Hero: las ventas que te trajeron tus aliados., Aliados: buscar negocios de la red y proponer alianza; aceptar propuestas; configurar descuento con un deslizador que **se detiene en el máximo sin perder** y muestra la cuenta (reusa el simulador); métricas por aliado., Cobrar: opción "Cliente referido por…" (o código de referido) que muestra precio original, descuento del aliado y total antes de generar el QR; el QR se crea por el total con descuento., `nav.ts` de aliados en grupo `negocio`.
- **Tests:** slider_stops_at_max_discount, proposes_alliance_to_network_business, cobrar_applies_referral_discount_before_qr
- **Verify:** `npm --prefix web test -- --run src/features/aliados src/features/cobrar && npm --prefix web run build`
- **Next step:** mock de `/api/alliances` y test del deslizador.

## HACK-027 · Pagos periódicos detectados y recomendaciones explicadas

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C2 · idea original: analizar finanzas y recomendar (pagos periódicos) · `docs/CONTEXTO-CoDi.md` §8.3, §8.4
- **Depends on:** HACK-008
- **Paths:** app/services/recurring.py, app/routers/recommendations.py, app/fixtures/expenses_history_demo.json, app/tests/test_recurring.py, web/src/features/cierre/
- **Freeze-Allowed:** no
- **Acceptance:** Detecta gastos repetidos por descripción/categoría, monto similar (±10 %) y frecuencia (semanal, quincenal, mensual) con ≥ 3 ocurrencias; los propone como compromiso y el dueño confirma o descarta (nada se vuelve compromiso sin confirmación)., `GET /api/recommendations?business_id=` devuelve recomendaciones calculadas con reglas, cada una con periodo, datos usados y datos faltantes: "Tu renta ($1,200) vence en 5 días: reserva $240 diarios", "El gasto en tortillas subió 18 % vs. la semana pasada", "Tu producto con mejor margen es…"., Historial demo de 6 semanas de gastos (`demo_data`) cargado por `POST /api/demo/seed` o al arrancar., En la pantalla Cierre, sección "Recomendaciones" y "Pagos próximos" con botón confirmar/descartar.
- **Tests:** detects_monthly_rent_after_three_payments, does_not_commit_without_confirmation, recommendation_lists_used_and_missing_data, flags_growing_expense
- **Verify:** `uv run pytest -q app/tests/test_recurring.py && npm --prefix web test -- --run src/features/cierre && npm --prefix web run build`
- **Next step:** tabla de gastos con renta mensual en `test_recurring.py`.

## HACK-028 · Cobro a distancia: notificación push CoDi al celular del cliente

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C1 (aprovecha push de CoDi) · https://docs.pey.mx/en/docs/api/create-push-notification/ · https://docs.pey.mx/en/docs/webhooks/codi/pn/
- **Depends on:** HACK-026
- **Paths:** app/services/pey.py, app/services/payments.py, app/routers/push.py, app/tests/test_push.py, web/src/features/cobrar/, docs/PEY.md
- **Freeze-Allowed:** no
- **Acceptance:** Leer la doc de pey (create-push-notification y webhook `codi.pn.payment_received`) y anotar en `docs/PEY.md` el contrato real: payload PLANO como en QR (lección de HACK-020)., `PeyClient.create_push(phone, amount, concept, num_ref)` + Fake; `POST /api/orders/{id}/push` envía el cobro al celular (10 dígitos) de la orden existente., `payments.process_event` marca `paid` también con `codi.pn.payment_received` (asocia por la referencia guardada al enviar el push), con las mismas reglas de idempotencia y monto., Cobrar: botón "Enviar al celular del cliente" junto al QR; el estado sigue llegando por el mismo sondeo.
- **Tests:** sends_push_with_phone_and_amount, push_payment_webhook_marks_order_paid, rejects_invalid_phone
- **Verify:** `uv run pytest -q app/tests/test_push.py app/tests/test_webhooks.py && npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
- **Next step:** leer la doc de push de pey y copiar el ejemplo de payload a un test firmado.

## HACK-029 · Dividir la cuenta: cada amigo paga su parte con CoDi

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C5 · idea original: movimientos de dinero entre usuarios con QR u otro método innovador (sin guardar saldos: cada parte se paga directo al negocio)
- **Depends on:** HACK-028
- **Paths:** app/services/splits.py, app/routers/splits.py, app/services/payments.py, app/tests/test_splits.py, web/src/features/dividir/
- **Freeze-Allowed:** no
- **Acceptance:** Desde una orden, dividir en N partes (iguales o por montos); cada parte tiene su propio QR CoDi (o push) y su página `/pagar/<id>`; la orden pasa a `paid` cuando todas las partes están pagadas; el centavo sobrante va a la primera parte., El webhook de cada parte la marca pagada (reusa `payments.py`); la pantalla muestra quién falta., Nunca hay saldo en la app: el dinero va directo a la cuenta del negocio (Ley Fintech, `docs/CONTEXTO-CoDi.md` §11.2)., `nav.ts` en grupo `clientes` o acceso desde Cobrar.
- **Tests:** splits_order_into_equal_parts_with_remainder, order_paid_only_when_all_parts_paid, part_webhook_is_idempotent
- **Verify:** `uv run pytest -q app/tests/test_splits.py && npm --prefix web test -- --run src/features/dividir && npm --prefix web run build`
- **Next step:** test rojo: 100.00 entre 3 → 33.34, 33.33, 33.33.

## HACK-030 · Puntos NFC/QR del puesto (entrada, caja, mesa) revocables

- **Type:** feature
- **Priority:** P2
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C5 · idea original: stickers NFC en puntos estratégicos · `docs/CONTEXTO-CoDi.md` §7
- **Depends on:** HACK-022, HACK-023
- **Paths:** app/services/points.py, app/routers/points.py, app/tests/test_points.py, web/src/features/puntos/
- **Freeze-Allowed:** no
- **Acceptance:** Cada puesto crea puntos con tipo (entrada → perfil, caja → orden pendiente más reciente de ese punto, mesa → cuenta de la mesa) e identificador aleatorio revocable; `GET /p/<point_id>` resuelve el destino; un punto revocado muestra "Este punto ya no está activo"., Pantalla Puntos: lista, QR imprimible y la URL para grabar en un sticker NFC (instrucciones de 3 pasos con una app de NFC gratuita); el destino siempre muestra el receptor antes de pagar., Con dos órdenes pendientes en la misma caja pide elegir la correcta.
- **Tests:** entrance_point_opens_profile, cashier_point_opens_latest_pending_order, revoked_point_is_rejected, two_pending_orders_ask_to_choose
- **Verify:** `uv run pytest -q app/tests/test_points.py && npm --prefix web test -- --run src/features/puntos && npm --prefix web run build`
- **Next step:** test rojo de `revoked_point_is_rejected`.
## HACK-031 · Cada negocio tiene su cuenta receptora (simulada, lista para ser real)

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C1, C2 · idea original: cada negocio de la red recibe sus cobros · https://docs.pey.mx/en/docs/api/create-qr/ (`bankAccountId`)
- **Depends on:** HACK-023
- **Paths:** app/services/payout_accounts.py, app/routers/payout_accounts.py, app/services/orders.py, app/tests/test_payout_accounts.py, web/src/features/negocio/, web/src/features/pagar/, docs/PEY.md
- **Freeze-Allowed:** no
- **Acceptance:** Decisión de Dylan (2026-11-26): en el prototipo todos los cobros reales llegan a la cuenta CoDi de la plataforma; la cuenta de cada negocio es **simulada** y así se etiqueta en la UI y en la entrega. Nunca se afirma que el dinero llegó a la cuenta del negocio., Tabla propia `payout_accounts` (creada por el servicio): business_id, banco (de los 3 primeros dígitos de la CLABE), últimos 4 dígitos, `mode` = `simulated` | `pey` y `pey_bank_account_id` opcional. **No se guarda la CLABE completa** (sólo banco + últimos 4)., `PUT /api/businesses/{id}/payout-account` valida la CLABE: 18 dígitos y **dígito de control** (algoritmo oficial de pesos 3-7-1); CLABE inválida → 422 con mensaje claro., Al crear una orden (`orders.create_order`): si el negocio tiene `mode = pey` con `pey_bank_account_id`, se envía `bankAccountId` a `POST /codi/qr` (cobro real directo al negocio); si es `simulated` o no tiene cuenta, el QR va a la cuenta de la plataforma y la orden guarda `settlement = "simulada"` con "liquidación pendiente al negocio"., Alta del puesto: campo "CLABE donde recibes tus cobros" (opcional, con la etiqueta "Simulado en esta demo"). Página de pago: "Recibe: <negocio> · <banco> ·<últimos 4> (cuenta simulada)" antes de pagar., `docs/PEY.md`: cómo pasar a real (Register Bank Account de pey → `codiStatus: ACTIVE` → `mode = pey`).
- **Tests:** rejects_clabe_with_wrong_check_digit, stores_only_bank_and_last_four, order_uses_pey_bank_account_id_when_real, order_marks_settlement_simulated_without_real_account, pagar_shows_simulated_receiver_account
- **Verify:** `uv run pytest -q app/tests/test_payout_accounts.py app/tests/test_orders.py && npm --prefix web test -- --run src/features/negocio src/features/pagar && npm --prefix web run build`
- **Next step:** test rojo del dígito de control con una CLABE válida y la misma con el último dígito alterado.
## HACK-032 · Cobrar con centavos ($35.50)

- **Type:** bug
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C1, C4 · pedido de Dylan 2026-11-26
- **Depends on:** HACK-021
- **Paths:** web/src/features/cobrar/, app/services/pey.py, app/tests/test_pey_amounts.py
- **Freeze-Allowed:** yes
- **Acceptance:** Bug: el teclado de Cobrar sólo tiene dígitos y calcula `Number(digits) * 100`, así que no se puede cobrar $35.50., El teclado agrega la tecla "." (en el hueco junto al 0 o reemplazando "C" por un botón aparte); máximo 2 decimales; un solo punto; "0.50" y ".5" válidos; importe mostrado siempre como `$35.50`., El importe se convierte a centavos sin errores de coma flotante (parsear el texto, no multiplicar floats): "19.99" → 1999, "0.1" → 10, "35.5" → 3550; importe 0 deshabilita "Cobrar"., `HttpPeyClient` envía `amount` redondeado a 2 decimales (p. ej. `round(cents / 100, 2)` o `Decimal`), nunca `19.990000000000002`., Prueba manual en producción (Dylan): cobro real de $1.50 pasa a "Pagado $1.50".
- **Tests:** keypad_accepts_two_decimals, keypad_rejects_second_dot_and_third_decimal, converts_text_amount_to_cents_without_float_error, pey_amount_has_at_most_two_decimals
- **Verify:** `uv run pytest -q app/tests/test_pey_amounts.py && npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
- **Next step:** test rojo `converts_text_amount_to_cents_without_float_error` con "19.99" → 1999.
## HACK-033 · Rediseño v2: dirección profesional, atractiva y familiar (Dylan elige)

- **Type:** setup
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C4 (15 %), C2 · pedido de Dylan 2026-11-26: "el diseño no me termina de encantar; profesional, atractivo y familiar"
- **Depends on:** HACK-022
- **Paths:** web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/public/design-lock/, web/index.html
- **Freeze-Allowed:** yes
- **Acceptance:** Correr `/uak-design-lock` de nuevo con las skills `redesign-existing-projects`, `frontend-design` y `product-ui`: `bash .uak/bin/uak design round --screen landing --n 4` (y una ronda de Cobrar), con capturas reales; **Dylan elige** la dirección desde las capturas (`uak design pick`). No escribir la dirección en este plan., Diagnóstico de v1 que la nueva dirección debe resolver (capturas en producción 2026-11-26): títulos y montos en tipografía monoespaciada (se ve técnica y fría); bordes negros gruesos en botones, tarjetas y campos; todo morado sobre lila sin jerarquía; sin color de "dinero/éxito"; sin calidez ni contexto mexicano., Referencias de "familiar" para la ronda (inspiración, no copia de marca): apps de pago y banca que los comerciantes mexicanos ya usan (tarjetas blancas con sombra suave, tipografía sans amable, montos grandes y legibles, verde/acento para "Pagado"). La marca Negosocios conserva su nombre; nada que imite el logo o colores exactos de otra empresa., Entregables: tokens nuevos en `web/src/index.css` (color, tipografía sans de Google Fonts para texto **y** números con cifras tabulares, radios, sombras, espaciado), UI kit actualizado en `web/src/lib/ui/` (Button, Surface/Card, Stat/montos, Chip de estado, inputs sin borde negro, NavBar y barra inferior móvil), `web/DESIGN.md` v2 con la tabla de pantallas, y 3 pantallas bloqueadas (Inicio, Cobrar, Cierre) a 1280 y 390., Como las pantallas usan tokens y el kit, todas cambian sin tocar sus carpetas; verificar con capturas que Cobrar, Pagar, Cierre, Negocio, Voz y Explorar no se rompen. Contraste AA, tamaños táctiles ≥ 44 px., Veredicto `VERDICT: SHIP` del subagente design-critic antes de `uak done`.
- **Test-First:** no (dirección visual elegida por el humano desde capturas)
- **Verify:** `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/uak lint`
- **Next step:** capturas actuales de landing, cobrar y cierre como "antes", luego `uak design round`.

## HACK-034 · Landing v2 con contexto mexicano y la app en acción

- **Type:** feature
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C2, C4 · skill `landing-story` · la landing es lo primero que abre el jurado
- **Depends on:** HACK-033
- **Paths:** web/src/features/landing/, web/public/landing/, docs/CREDITS.md
- **Freeze-Allowed:** yes
- **Acceptance:** Recipe: landing · Hero: un puesto de tianguis cobrando con el celular y la pantalla real de "Pagado"., Rehacer con la dirección v2 y `landing-story`: una línea clara, foto o ilustración de comercio local mexicano (licencia libre: Unsplash/Pexels con crédito en `docs/CREDITS.md`, o SVG propio), maqueta de celular con capturas reales (Cobrar → Pagado, Cierre, Explorar), tres pasos con íconos, un dato con fuente (CoDi sin comisión, codi.org.mx), sección "Para el comerciante / Para el cliente", y CTA "Probar la demo"., Mobile-first: se ve impecable a 390 px; imágenes optimizadas (WebP, < 200 KB cada una) y con `alt`., Mantiene el aviso: usa CoDi y la API de pey, no es producto oficial.
- **Tests:** shows_value_line_and_demo_cta, shows_real_app_screens, images_have_alt_text
- **Verify:** `npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint`
- **Next step:** `/landing-story` con `IDEA.md` y la dirección v2 de `web/DESIGN.md`.
## HACK-035 · Auditoría de UX móvil y pulido de todos los flujos

- **Type:** feature
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C4, C2 · pedido de Dylan 2026-11-26: la UX es lo más importante; la mayoría usará celular
- **Depends on:** HACK-033, HACK-024, HACK-026, HACK-027, HACK-031
- **Paths:** web/src/features/cobrar/, web/src/features/pagar/, web/src/features/cierre/, web/src/features/negocio/, web/src/features/voz/, web/src/features/explorar/, web/src/features/aliados/, docs/UX-AUDIT.md
- **Freeze-Allowed:** yes
- **Acceptance:** Recorrer en un celular simulado (390×844, skill `webapp-testing`) cada flujo y registrar en `docs/UX-AUDIT.md` pasos/toques, problemas y arreglo: (1) cobrar $35.50 hasta ver "Pagado", (2) cliente abre `/pagar/<id>`, ve a quién paga y su comprobante, (3) cierre del día y simular promoción, (4) dictar un gasto y confirmarlo, (5) dar de alta el puesto, (6) encontrar un negocio en Explorar, (7) aplicar descuento de aliado al cobrar., Arreglos mínimos esperados: en Cobrar el importe va **arriba** del teclado y el botón Cobrar queda fijo al alcance del pulgar; cobrar toma ≤ 3 toques tras teclear el importe; "Pagado" se ve a pantalla completa con sonido/vibración; teclados nativos correctos (`inputmode="decimal"` en montos, `tel` en teléfonos); nada queda oculto bajo la barra inferior ni el teclado del celular; botones ≥ 44 px; textos en lenguaje del comerciante., Capturas antes/después a 390 de cada flujo en el PR; veredicto `VERDICT: SHIP` del design-critic.
- **Tests:** cobrar_amount_is_above_keypad, cobrar_action_is_fixed_in_thumb_zone, amount_inputs_use_decimal_keyboard, no_content_hidden_behind_bottom_nav
- **Verify:** `npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/design-lint && test -s docs/UX-AUDIT.md`
- **Next step:** recorrer el flujo 1 a 390 px con Playwright y anotar cada toque.
## HACK-036 · Poblar la app con una red de negocios creíble (datos de ejemplo)

- **Type:** feature
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C2, C4, C5 · pedido de Dylan 2026-11-26: poblar la app con negocios aunque todos cobren a la misma cuenta
- **Depends on:** HACK-023, HACK-025, HACK-027, HACK-031
- **Paths:** app/fixtures/population/, app/services/populate.py, app/routers/populate.py, app/tests/test_populate.py, docs/DEMO-DATA.md
- **Freeze-Allowed:** yes
- **Acceptance:** Al arrancar (evento de startup en `app/routers/populate.py`, idempotente: nunca duplica ni pisa datos creados por usuarios) se cargan desde `app/fixtures/population/*.json`:, **30–40 negocios ficticios** en 3–4 zonas de la CDMX (un tianguis, un mercado, una calle comercial y un corredor de oficinas), con giros variados: fondas, tacos, tortillería, frutería, papelería, barbería, estética, abarrotes, recaudería, jugos, tamales, reparación de celulares, costurera, cerrajería, puesto de flores; mezcla de puestos itinerantes (ubicación temporal con horario) y negocios fijos; 2–3 negocios grandes con varias sucursales., Perfil de red completo: ubicación aproximada, horario, acepta CoDi, sello "Verificado: <qué se comprobó>" en la mitad, precios y costos de 3–5 productos., **Cuenta receptora simulada** por negocio (`mode = simulated`, banco + últimos 4 ficticios; nunca CLABEs completas). Todos los cobros reales siguen llegando a la cuenta de la plataforma., **Alianzas**: 12–15 activas entre negocios complementarios cercanos (fonda + jugos, papelería + copias, barbería + estética…), cada una con descuento dentro de su máximo sin perder, presupuesto, referidos y métricas., **Reseñas** de 1–5 estrellas sólo sobre órdenes pagadas de ejemplo (distribución realista, la mayoría 4–5, algunas 2–3 con texto), y **historial de 6 semanas** de ventas pagadas y gastos (con renta, proveedores y servicios recurrentes) para que Cierre y Recomendaciones muestren datos., Nombres de negocios y personas **ficticios**; sin teléfonos, CLABEs ni direcciones exactas reales; textos en español mexicano natural (sin "Lorem ipsum")., Todo lleva `demo_data: true` y la UI lo muestra con la etiqueta "Datos de ejemplo" (ya existente) en perfiles y métricas., El negocio de Dylan para la demo (`rosa`) sigue existiendo y queda conectado a la red (aliados, reseñas, historial)., `docs/DEMO-DATA.md`: qué se siembra, cómo regenerarlo y aviso de que todos los cobros reales van a la cuenta de la plataforma.
- **Tests:** populates_network_once_on_startup, does_not_overwrite_user_created_business, alliance_discounts_respect_max_discount, reviews_only_on_paid_orders, all_seeded_records_are_demo_data, no_full_clabe_or_phone_in_fixtures
- **Verify:** `uv run pytest -q app/tests/test_populate.py && bash .uak/bin/smoke-project`
- **Next step:** escribir `app/fixtures/population/businesses.json` con 5 negocios y el test de idempotencia (rojo).

## HACK-037 · NavBar móvil: los grupos reparten el ancho en partes iguales y recortan Explorar a 390 px; repartir por número de entradas (follow-up of HACK-022)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HACK-022
- **Follow-up of:** HACK-022
- **Paths:** web/src/App.tsx, web/src/lib/ui/NavBar.tsx, web/src/features/landing/nav.ts, web/src/features/cobrar/nav.ts, web/src/features/cierre/nav.ts, web/src/features/negocio/nav.ts, web/src/features/voz/nav.ts, web/src/features/pagar/nav.ts, web/src/test/nav.test.tsx
- **Freeze-Allowed:** no
- **Acceptance:**
  - NavBar móvil: los grupos reparten el ancho en partes iguales y recortan Explorar a 390 px; repartir por número de entradas
- **Verify:** `npm --prefix web test -- --run src/test/nav.test.tsx && npm --prefix web run build`

## HACK-038 · Alianzas: listar por negocio (GET /api/alliances?business_id=) y resolver por código de referido (GET /api/alliances/code/{code}) para la pantalla Aliados y Cobrar (follow-up of HACK-025)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HACK-025
- **Follow-up of:** HACK-025
- **Paths:** app/services/alliances.py, app/routers/alliances.py, app/services/reviews.py, app/routers/reviews.py, app/tests/test_alliances.py, app/tests/test_reviews.py
- **Freeze-Allowed:** no
- **Acceptance:**
  - Alianzas: listar por negocio (GET /api/alliances?business_id=) y resolver por código de referido (GET /api/alliances/code/{code}) para la pantalla Aliados y Cobrar
- **Verify:** `uv run pytest -q app/tests/test_alliances.py app/tests/test_reviews.py`

## HACK-039 · Actualizar la prueba antigua del menú para conservar Inicio, Pagar oculto y orden base sin rechazar features nuevas como Aliados (follow-up of HACK-012)

- **Type:** follow-up
- **Priority:** P1
- **Depends on:** HACK-012
- **Follow-up of:** HACK-012
- **Paths:** web/src/features/negocio/
- **Freeze-Allowed:** no
- **Acceptance:**
  - Actualizar la prueba antigua del menú para conservar Inicio, Pagar oculto y orden base sin rechazar features nuevas como Aliados
- **Verify:** `npm --prefix web test -- --run src/features/negocio && npm --prefix web run build`
