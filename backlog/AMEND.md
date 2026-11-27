# Amended tasks (uak plan --amend)

Append-only; the last section of an ID replaces its section in the backlog. Why: Paths can grow before review.

## HACK-015 · Producción: deploy, webhook real y smoke del producto

- **Type:** integration
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C3 · `docs/PEY.md` · reglas §6.3 (ambiente productivo)
- **Depends on:** HACK-007, HACK-009, HACK-010
- **Paths:** .uak/bin/smoke-project, .uak/bin/.smoke-project.provenance, docs/DEPLOY.md, docs/evidence/
- **Freeze-Allowed:** yes
- **Acceptance:** `bash .uak/bin/uak init-smoke` arranca la app y pide `/api/health`; se commitean `smoke-project` y su provenance., `docs/DEPLOY.md`: pasos para Dylan (crear el servicio en Render desde `render.yaml`, poner `PEY_API_KEY`/`PEY_WEBHOOK_SECRET` en Render, registrar `https://<app>/api/webhooks/pey` en portal.pey.mx, poner `Live-URL` en PROJECT.md)., Un cobro real de 1 MXN en producción pasa a "Pagado" en Cobrar y en Pagar; la evidencia (captura + `webhook-id` del log de pey) queda en el PR.
- **Test-First:** no (configuración de despliegue y prueba manual con dinero real)
- **Verify:** `bash .uak/bin/smoke-project`
- **Next step:** `bash .uak/bin/uak deploy` para ver lo que falta.

## HACK-016 · Video de demo y materiales de entrega

- **Type:** demo
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1–C5 · reglas §10.1
- **Depends on:** HACK-014, HACK-015, HACK-024, HACK-026
- **Paths:** docs/SUBMISSION.md, docs/DEMO.md
- **Freeze-Allowed:** yes
- **Acceptance:** `docs/SUBMISSION.md`: descripción ≤ 500 palabras que dice explícitamente cómo usa el API de pey; instrucciones de prueba ≤ 1000 palabras; declaración de componentes previos y de terceros; integrantes., `docs/DEMO.md`: guion del video ≤ 3 min: cobro CoDi real desde el QR hasta "Pagado" por webhook, descuento de aliado al cobrar, mapa Explorar y cierre del día con recomendaciones; plan B (video grabado).
- **Test-First:** no (documentos de entrega)
- **Verify:** `test $(wc -w < docs/SUBMISSION.md) -le 1600 && grep -qi 'pey' docs/SUBMISSION.md && test -s docs/DEMO.md`
- **Next step:** `/uak-demo`.
## HACK-032 · Cobrar con centavos ($35.50)

- **Type:** bug
- **Priority:** P0
- **Estimate:** 30 min
- **Rubric / Spec:** C1, C4 · pedido de Dylan 2026-11-26
- **Depends on:** HACK-021
- **Paths:** web/src/features/cobrar/, app/services/pey.py, app/tests/test_pey_amounts.py, docs/PEY.md
- **Freeze-Allowed:** yes
- **Acceptance:** Bug: el teclado de Cobrar sólo tiene dígitos y calcula `Number(digits) * 100`, así que no se puede cobrar $35.50., El teclado agrega la tecla "." (en el hueco junto al 0 o reemplazando "C" por un botón aparte); máximo 2 decimales; un solo punto; "0.50" y ".5" válidos; importe mostrado siempre como `$35.50`., El importe se convierte a centavos sin errores de coma flotante (parsear el texto, no multiplicar floats): "19.99" → 1999, "0.1" → 10, "35.5" → 3550, **"0.01" → 1 (importe mínimo permitido: $0.01)**; importe 0 deshabilita "Cobrar". El backend ya acepta `amount_cents = 1`; pey recibe `amount: 0.01`., `HttpPeyClient` envía `amount` redondeado a 2 decimales (p. ej. `round(cents / 100, 2)` o `Decimal`), nunca `19.990000000000002`., Prueba manual en producción (Dylan): cobro real de **$0.01** pasa a "Pagado $0.01" (si el banco o pey rechazan $0.01, registrar el mínimo real en `docs/PEY.md` y mostrarlo en Cobrar).
- **Tests:** charges_one_cent_minimum, keypad_accepts_two_decimals, keypad_rejects_second_dot_and_third_decimal, converts_text_amount_to_cents_without_float_error, pey_amount_has_at_most_two_decimals
- **Verify:** `uv run pytest -q app/tests/test_pey_amounts.py && npm --prefix web test -- --run src/features/cobrar && npm --prefix web run build`
- **Next step:** test rojo `converts_text_amount_to_cents_without_float_error` con "19.99" → 1999.
