# worklog/WL-1795892018-dylan-3-HACK-053-hack.eqq2Og.md · HACK-053

## Live summary
- Done: PR #50 en REVIEW, SHA a45ad23. Rechazos #283 y #293 corregidos. Verify: 35 pruebas; población/reseñas y PRODUCT_PASS verdes. HACK-048 revisada en 7291e04: REJECT por integraciones pendientes; alcance y scroll ya correctos.
- Decision: Vinculación explícita de reservas legadas nuevas con clave original; lectura histórica conservadora.
- Why: Distinguir claves futuras e IDs de compras distintas sin corromper reintentos ni métricas.
- Failing: Ninguno en Verify de HACK-053; pendiente veredicto independiente.
- Commands: uak done HACK-053 REVIEW; pytest coupons+alliances exit 0; pytest populate+reviews exit 0; smoke PRODUCT_PASS; review HACK-048 reject registrado.
- Next: Integrated in main: b97a4ba4ed0b92ff8e4dce2b770435d48f652512

## History
- 1795892018 | CLAIMED | dylan-3 | claim; next: Escribir tests rojos de cupones de un solo uso y contrato claim/redeem | Harness: unknown | Model: unknown
- 1795892038 | CLAIMED | dylan-3 | handover; dylan-3 → dylan-4 by dylan-3 | Harness: unknown | Model: unknown
- 1795892361 | CLAIMED | dylan-4 | checkpoint; next: Revisar respuesta contrato; advisor done; smoke; commit push PR REVIEW | Harness: unknown | Model: unknown
- 1795892684 | CLAIMED | dylan-4 | checkpoint; next: Humano plan --amend .uak-shots/HACK053/amend.md; aplicar legacy-guard.patch, Verify/smoke, advisor GO, actualizar PR50 y REVIEW | Harness: unknown | Model: unknown
- 1795892759 | BLOCKED | dylan-4 | Fuera de Paths: falta guard en app/services/alliances.py; test_coupon_reservation_blocks_later_legacy_code da200 en vez409 y concurrent da[200,200]. PR50 draft; parche y amend.md preparados; autorización humana pendiente. | Harness: unknown | Model: unknown
- 1795892785 | BLOCKED | dylan-4 | checkpoint; next: En hack-053: UAK_HUMAN=Dylan bash .uak/bin/uak plan .uak-shots/HACK-053/amend.md --amend; aplicar .uak-shots/HACK-053/legacy-guard.patch; Verify27/smoke; advisor GO; PR50 REVIEW | Harness: unknown | Model: unknown
- 1795893093 | CLAIMED | dylan-4 | Paths ampliados por humano: se aplica guard de doble descuento en alliances.py | Harness: unknown | Model: unknown
- 1795893247 | REVIEW | dylan-4 | done; PR https://github.com/DylanMCDS/Negosocios/pull/50; evidence: abe8265: Verify uv run pytest -q app/tests/test_coupons.py app/tests/test_alliances.py exit0 (27 pruebas); smoke --affected exit0; smoke PRODUCT_PASS exit0; advisor GO. Guard bilateral cupón/código bajo BEGIN IMMEDIATE, dos regresiones antes rojas ahora verdes, concurrencia un solo beneficio. Paths ampliados por Dylan; no cambios en db.py ni esquemas existentes. · red at c5e08a8: E   assert 409 == 201; reviewer: - | Harness: unknown | Model: unknown
- 1795893327 | REVIEW | dylan-4 | checkpoint; next: Esperar revisión HACK-053; cerrar re-review HACK-047 SHA3f1b1d6 y ack inbox | Harness: unknown | Model: unknown
- 1795893433 | REVIEW | dylan-4 | checkpoint; next: Esperar veredicto HACK-053 en PR50; atender reject/approve según protocolo | Harness: unknown | Model: unknown
- 1795893460 | REVIEW | dylan-3 | review; reject; SHA abe8265985d653cefac5b708dbec671d6e64b610; reviewer dylan-3 | Harness: unknown | Model: unknown
- 1795893967 | REVIEW | dylan-4 | done; PR https://github.com/DylanMCDS/Negosocios/pull/50; evidence: 105f415: Verify coupons+alliances exit0 (31 pruebas), smoke --affected exit0, smoke PRODUCT_PASS, advisor GO; main integrado. Cuatro regresiones nuevas primero rojas y ahora verdes. · red at c5e08a8: E   assert 409 == 201; reviewer: - | Harness: unknown | Model: unknown
- 1795894184 | REVIEW | dylan-4 | checkpoint; next: Esperar veredicto HACK-053; completar review HACK-048 SHA27948b6 y ack inbox | Harness: unknown | Model: unknown
- 1795894303 | REVIEW | dylan-3 | review; reject; SHA 105f415bd9275a183f41dfd4b3f15141fdf60693; reviewer dylan-3 | Harness: unknown | Model: unknown
- 1795894873 | REVIEW | dylan-4 | done; PR https://github.com/DylanMCDS/Negosocios/pull/50; evidence: a45ad23: Verify coupons+alliances exit0 (35 pruebas); población/reseñas exit0; smoke --affected exit0; smoke PRODUCT_PASS; advisor GO. Regresiones de ambos rechazos verificadas. · red at c5e08a8: E   assert 409 == 201; reviewer: - | Harness: unknown | Model: unknown
- 1795894910 | REVIEW | dylan-4 | checkpoint; next: Esperar aprobación o rechazo de HACK-053; atender mensajes. HACK-046 ya INTEGRATED y no requiere revisión. | Harness: unknown | Model: unknown
- 1795895961 | REVIEW | dylan-5 | review; approve; SHA a45ad23bd9c003c77960dcc6e90407a8c962fbc5; reviewer dylan-5 | Harness: claude-code | Model: claude-sonnet-5-5
- 1795896024 | INTEGRATED | dylan-4 | merge; smoke and Verify PASS (smoke: full); commit b97a4ba4ed0b92ff8e4dce2b770435d48f652512; reviewer dylan-5 | Harness: unknown | Model: unknown
