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
## HACK-033 · Rediseño v2: dirección profesional, atractiva y familiar (Dylan elige)

- **Type:** setup
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C4 (15 %), C2 · pedido de Dylan 2026-11-26: "el diseño no me termina de encantar; profesional, atractivo y familiar"
- **Depends on:** HACK-022
- **Paths:** web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/public/design-lock/, web/index.html
- **Freeze-Allowed:** yes
- **Acceptance:** Correr `/uak-design-lock` de nuevo con las skills `redesign-existing-projects`, `frontend-design` y `product-ui`: `bash .uak/bin/uak design round --screen landing --n 4` (y una ronda de Cobrar), con capturas reales; **Dylan elige** la dirección desde las capturas (`uak design pick`). No escribir la dirección en este plan., Diagnóstico de v1 que la nueva dirección debe resolver (capturas en producción 2026-11-26): títulos y montos en tipografía monoespaciada (se ve técnica y fría); bordes negros gruesos en botones, tarjetas y campos; todo morado sobre lila sin jerarquía; sin color de "dinero/éxito"; sin calidez ni contexto mexicano., Referencias de "familiar" para la ronda (inspiración, no copia de marca): apps de pago y banca que los comerciantes mexicanos ya usan (tarjetas blancas con sombra suave, tipografía sans amable, montos grandes y legibles, verde/acento para "Pagado"). La marca Negosocios conserva su nombre; nada que imite el logo o colores exactos de otra empresa., Entregables: tokens nuevos en `web/src/index.css` (color, tipografía sans de Google Fonts para texto **y** números con cifras tabulares, radios, sombras, espaciado), UI kit actualizado en `web/src/lib/ui/` (Button, Surface/Card, Stat/montos, Chip de estado, inputs sin borde negro, NavBar y barra inferior móvil), `web/DESIGN.md` v2 con la tabla de pantallas, y 3 pantallas bloqueadas (Inicio, Cobrar, Cierre) a 390 (principal) y 1280., Como las pantallas usan tokens y el kit, todas cambian sin tocar sus carpetas; verificar con capturas que Cobrar, Pagar, Cierre, Negocio, Voz y Explorar no se rompen. Contraste AA, tamaños táctiles ≥ 44 px., **Prioridad de Dylan: la experiencia de usuario es lo más importante y la mayoría usará celular.** Diseñar primero a 390×844 y después escritorio: rondas de diseño a 390 px; navegación inferior fija con íconos + texto; acción principal al alcance del pulgar (mitad inferior); una sola acción principal por pantalla; texto ≥ 16 px; montos grandes; estados de carga, vacío y error amables en lenguaje simple (sin jerga técnica)., Veredicto `VERDICT: SHIP` del subagente design-critic antes de `uak done`, con capturas a 390 y 1280.
- **Test-First:** no (dirección visual elegida por el humano desde capturas)
- **Verify:** `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/uak lint`
- **Next step:** capturas actuales de landing, cobrar y cierre como "antes", luego `uak design round`.

## HACK-016 · Video de demo y materiales de entrega

- **Type:** demo
- **Priority:** P0
- **Estimate:** 60 min
- **Rubric / Spec:** C1–C5 · reglas §10.1
- **Depends on:** HACK-014, HACK-015, HACK-024, HACK-026, HACK-034, HACK-035, HACK-036
- **Paths:** docs/SUBMISSION.md, docs/DEMO.md
- **Freeze-Allowed:** yes
- **Acceptance:** `docs/SUBMISSION.md`: descripción ≤ 500 palabras que dice explícitamente cómo usa el API de pey; instrucciones de prueba ≤ 1000 palabras; declaración de componentes previos y de terceros; integrantes., `docs/DEMO.md`: guion del video ≤ 3 min: cobro CoDi real desde el QR hasta "Pagado" por webhook, descuento de aliado al cobrar, mapa Explorar y cierre del día con recomendaciones; plan B (video grabado).
- **Test-First:** no (documentos de entrega)
- **Verify:** `test $(wc -w < docs/SUBMISSION.md) -le 1600 && grep -qi 'pey' docs/SUBMISSION.md && test -s docs/DEMO.md`
- **Next step:** `/uak-demo`.
## HACK-035 · Auditoría de UX móvil y pulido de todos los flujos

- **Type:** feature
- **Priority:** P0
- **Estimate:** 90 min
- **Rubric / Spec:** C4, C2 · pedido de Dylan 2026-11-26: la UX es lo más importante; la mayoría usará celular
- **Depends on:** HACK-033, HACK-024, HACK-026, HACK-027, HACK-031
- **Paths:** web/src/features/cobrar/, web/src/features/pagar/, web/src/features/cierre/, web/src/features/negocio/, web/src/features/voz/, web/src/features/explorar/, web/src/features/aliados/, docs/UX-AUDIT.md, web/src/lib/ui/, web/src/App.tsx, web/src/features/puntos/, web/src/test/
- **Freeze-Allowed:** yes
- **Acceptance:** Recorrer en un celular simulado (390×844, skill `webapp-testing`) cada flujo y registrar en `docs/UX-AUDIT.md` pasos/toques, problemas y arreglo: (1) cobrar $35.50 hasta ver "Pagado", (2) cliente abre `/pagar/<id>`, ve a quién paga y su comprobante, (3) cierre del día y simular promoción, (4) dictar un gasto y confirmarlo, (5) dar de alta el puesto, (6) encontrar un negocio en Explorar, (7) aplicar descuento de aliado al cobrar., Arreglos mínimos esperados: en Cobrar el importe va **arriba** del teclado y el botón Cobrar queda fijo al alcance del pulgar; cobrar toma ≤ 3 toques tras teclear el importe; "Pagado" se ve a pantalla completa con sonido/vibración; teclados nativos correctos (`inputmode="decimal"` en montos, `tel` en teléfonos); nada queda oculto bajo la barra inferior ni el teclado del celular; botones ≥ 44 px; textos en lenguaje del comerciante., Capturas antes/después a 390 de cada flujo en el PR; veredicto `VERDICT: SHIP` del design-critic. · Barra inferior móvil (decisión de Dylan 2026-11-27): 5 entradas Inicio · Cobrar (centro, destacada) · Cierre · Explorar · Más; "Más" abre Negocio, Aliados, Puntos NFC/QR y Voz; cada celda ≥ 44 px, sin texto cortado a 390 px; escritorio puede mostrar todas.
- **Tests:** cobrar_amount_is_above_keypad, cobrar_action_is_fixed_in_thumb_zone, amount_inputs_use_decimal_keyboard, no_content_hidden_behind_bottom_nav
- **Verify:** `npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/design-lint && test -s docs/UX-AUDIT.md`
- **Next step:** recorrer el flujo 1 a 390 px con Playwright y anotar cada toque.
## HACK-053 · Cupones de alianza (backend): emitir, guardar, validar y canjear

- **Type:** feature
- **Priority:** P1
- **Estimate:** 90 min
- **Rubric / Spec:** C2, C5 · prueba de Dylan 2026-11-28: wallet de cupones del cliente; el negocio escanea el cupón; el cupón se guarda al consumir en el negocio aliado y se aplica solo en el otro
- **Depends on:** HACK-025, HACK-038
- **Paths:** app/services/coupons.py, app/routers/coupons.py, app/tests/test_coupons.py, docs/COUPONS.md, app/services/alliances.py
- **Freeze-Allowed:** yes
- **Acceptance:** Un **cupón** es por cliente (token aleatorio de un solo uso), pertenece a una alianza y se emite en el negocio que **da** el beneficio; sólo vale en el negocio aliado (la dirección de la alianza) y vence a los 7 días., `POST /api/coupons/claim` (negocio emisor + orden pagada de ese negocio, o el punto del negocio) emite un cupón **sólo** si hay una orden pagada en ese negocio que no haya reclamado ya uno; sin orden pagada, 409 con motivo en español., `GET /api/coupons/{token}` devuelve estado (vigente, usado, vencido), negocio emisor, negocio donde vale y descuento; sin datos sensibles., `POST /api/coupons/{token}/redeem` con la orden del negocio donde vale: aplica el descuento con las mismas reglas de la alianza (un beneficio por orden, tope de usos y de presupuesto, descuento en centavos enteros) y marca el cupón **usado** de forma atómica; un segundo canje devuelve 409., El cupón no sirve en otro negocio ni después de vencer; reintentar el mismo canje con la misma orden es idempotente., **Sin doble descuento:** una orden que ya consumió un cupón no acepta otro beneficio por el endpoint de código de alianza (`quote`), y al revés; el arreglo en `app/services/alliances.py` se limita a esa regla y no cambia el resultado de un cobro con código normal sin cupón., Tablas propias (`coupons`), sin tocar `db.py` ni los esquemas existentes; documentar el contrato en `docs/COUPONS.md`., Datos de ejemplo con `demo_data: true`.
- **Tests:** claim_requires_paid_order_at_issuing_business, coupon_is_single_use, coupon_only_valid_at_partner_business, coupon_expires_after_seven_days, redeem_respects_budget_and_one_benefit_per_order, redeem_is_idempotent_for_same_order, coupon_view_never_exposes_sensitive_data
- **Verify:** `uv run pytest -q app/tests/test_coupons.py app/tests/test_alliances.py`
- **Next step:** aplicar el parche preparado en `app/services/alliances.py` y correr Verify.
## HACK-048 · App fluida: transiciones suaves entre pantallas, sin saltos ni pantallas en blanco

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C2 · prueba de Dylan 2026-11-28: "que la app se sienta muy fluida sin transiciones bruscas"
- **Depends on:** HACK-005
- **Paths:** web/src/App.tsx, web/src/index.css, web/src/lib/ui/, web/src/lib/motion/, web/src/features/pagar/index.tsx
- **Freeze-Allowed:** yes
- **Acceptance:** Al cambiar de pantalla (menú, enlaces `#...`) hay una transición corta (150-220 ms, fundido con un pequeño desplazamiento) con la View Transitions API cuando existe y un fundido CSS como respaldo; nunca un corte seco., Con `prefers-reduced-motion` no hay movimiento: cambio inmediato o fundido sin desplazamiento., Sin saltos de diseño: los estados "Cargando…" usan un esqueleto del mismo tamaño que el contenido final; las listas y tarjetas no cambian de alto al llegar los datos (sin CLS visible)., Al cambiar de pantalla se vuelve arriba suavemente y se conserva la posición al volver atrás; la barra del menú no parpadea ni se re-monta., Botones y tarjetas tocables con respuesta táctil breve (pulsado/hover) sin animar propiedades que causen reflujo (sólo `opacity` y `transform`)., Las pantallas de estado largo (Pagado, Comprobante, Cuenta completa) entran con un fundido, no aparecen de golpe., Un solo módulo de movimiento (`web/src/lib/motion/`) con duraciones y curvas en tokens, sin animaciones sueltas por pantalla., Recipe: shell · Hero: el cambio de pantalla del menú., Captura a 390 y 1280 (con y sin reduced motion); design-critic SHIP.
- **Tests:** route_change_uses_transition_and_respects_reduced_motion, loading_states_render_skeleton_not_text, motion_tokens_are_single_source, pagado_screen_fades_in
- **Verify:** `npm --prefix web test -- --run src/lib src/App && npm --prefix web run build && bash .uak/bin/design-lint`
- **Next step:** test rojo de `route_change_uses_transition_and_respects_reduced_motion`.
## HACK-048 · App fluida: transiciones suaves entre pantallas, sin saltos ni pantallas en blanco

- **Type:** feature
- **Priority:** P1
- **Estimate:** 60 min
- **Rubric / Spec:** C5, C2 · prueba de Dylan 2026-11-28: "que la app se sienta muy fluida sin transiciones bruscas"
- **Depends on:** HACK-005
- **Paths:** web/src/App.tsx, web/src/index.css, web/src/lib/ui/, web/src/lib/motion/, web/src/features/pagar/index.tsx
- **Freeze-Allowed:** yes
- **Acceptance:** Al cambiar de pantalla (menú, enlaces `#...`) hay una transición corta (150-220 ms, fundido con un pequeño desplazamiento) con la View Transitions API cuando existe y un fundido CSS como respaldo; nunca un corte seco., Con `prefers-reduced-motion` no hay movimiento: cambio inmediato o fundido sin desplazamiento., Sin saltos de diseño: el módulo de movimiento ofrece `SkeletonList` y `FadeIn` (esqueleto del mismo tamaño que el contenido final, sin CLS) y se usan en el shell y en el comprobante de Pagar. Adoptarlos en Cierre, Cobrar y Dividir se hace en HACK-056 (esos archivos son de HACK-052, enmienda humana de Dylan 2026-11-28)., Al cambiar de pantalla se vuelve arriba suavemente y se conserva la posición al volver atrás; la barra del menú no parpadea ni se re-monta., Botones y tarjetas tocables con respuesta táctil breve (pulsado/hover) sin animar propiedades que causen reflujo (sólo `opacity` y `transform`)., El comprobante de Pagar entra con un fundido (`FadeIn`), no aparece de golpe; los fundidos de "Pagado" (Cobrar) y "Cuenta completa" (Dividir) pasan a HACK-056., Un solo módulo de movimiento (`web/src/lib/motion/`) con duraciones y curvas en tokens, sin animaciones sueltas por pantalla., Recipe: shell · Hero: el cambio de pantalla del menú., Captura a 390 y 1280 (con y sin reduced motion); design-critic SHIP.
- **Tests:** route_change_uses_transition_and_respects_reduced_motion, loading_states_render_skeleton_not_text, motion_tokens_are_single_source, pagado_screen_fades_in
- **Verify:** `npm --prefix web test -- --run src/lib src/App && npm --prefix web run build && bash .uak/bin/design-lint`
- **Next step:** quitar de la rama lo que dependa de cierre/cobrar/dividir, correr Verify y `uak done` con la nota de la enmienda.
