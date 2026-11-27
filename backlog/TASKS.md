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
