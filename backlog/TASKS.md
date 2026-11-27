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
