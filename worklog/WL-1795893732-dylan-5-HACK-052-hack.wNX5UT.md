# worklog/WL-1795893732-dylan-5-HACK-052-hack.wNX5UT.md · HACK-052

## Live summary
- Done: 5 pruebas rojas->verdes; isLive+ApiError; dividir/cobrar/cierre
- Decision: fallo de dividir.test lists_pending_charges por fixture con expires_at vencido; pido allow --tests (msg #299)
- Why: filtro de vigentes oculta el fixture de ayer
- Failing: dividir.test lists_pending_charges_to_split
- Commands: npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib
- Next: tras allow: fixture relativo, Verify, critic 390/1280, done

## History
- 1795893732 | CLAIMED | dylan-5 | claim; next: primer test rojo | Harness: unknown | Model: unknown
- 1795894778 | CLAIMED | dylan-5 | checkpoint; next: tras allow: fixture relativo, Verify, critic 390/1280, done | Harness: unknown | Model: unknown
