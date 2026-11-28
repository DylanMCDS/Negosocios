# worklog/WL-1795896879-dylan-4-HACK-055-hack.l1tWkZ.md · HACK-055

## Live summary
- Done: wallet + claim en sticker + aplicar cupón (puntos/pagar); Verify verde
- Decision: hook useSavedCoupons en cupones, compartido por puntos y pagar; sólo vista previa del descuento
- Why: redeem exige orden pendiente con total ya descontado; no se puede reservar sobre un cobro a importe completo
- Failing: ninguno
- Commands: npm --prefix web test -- --run src/features/cupones src/features/pagar src/features/puntos && npm --prefix web run build && bash .uak/bin/design-lint
- Next: capturas 390/1280 en .uak-shots/HACK-055, design-critic SHIP, uak done

## History
- 1795896879 | CLAIMED | dylan-4 | claim; next: Escribir tests rojos del wallet de tokens y QR; contrastar flujo NFC con docs/COUPONS.md antes de implementar autoaplicación | Harness: unknown | Model: unknown
- 1795896925 | CLAIMED | dylan-4 | checkpoint; next: Leer docs/COUPONS.md y web/DESIGN.md; verificar contrato NFC y canje pre-QR; escribir tests wallet_lists_saved_coupons_with_status y wallet_shows_qr_for_valid_coupon; uak red HACK-055. | Harness: unknown | Model: unknown
- 1795896937 | CLAIMED | dylan-4 | handoff; next: Leer docs/COUPONS.md y web/DESIGN.md; verificar contrato NFC y canje pre-QR; escribir tests wallet_lists_saved_coupons_with_status y wallet_shows_qr_for_valid_coupon; uak red HACK-055. | Harness: unknown | Model: unknown
- 1795897929 | CLAIMED | dylan-4 | pending decision HACK-055-1795897929; option: Primer criterio: wallet de lectura, registro en Clientes y pruebas de lista/QR/privacidad; sin canjes ni cambios al QR de cobros existentes.; Why: PACE critical impide asesor fuerte; cambio reversible dentro de Paths, sin contrato financiero nuevo. Validar con tests y navegador antes del checkpoint. | Harness: unknown | Model: unknown
- 1795898772 | CLAIMED | dylan-1 | handover; dylan-4 → dylan-1 by Dylan | Harness: claude-code | Model: claude-sonnet-5-5
- 1795898954 | CLAIMED | dylan-1 | checkpoint; next: capturas 390/1280 en .uak-shots/HACK-055, design-critic SHIP, uak done | Harness: unknown | Model: unknown
