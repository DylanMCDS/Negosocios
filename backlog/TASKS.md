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
