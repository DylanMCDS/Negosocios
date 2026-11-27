# worklog/WL-1795738569-dylan-3-HACK-006-hack.O8v8AV.md · HACK-006

## Live summary
- Done: Business public profile, QR orders, idempotent retries, provider failure rollback, GET payment detail; 13 order cases and full 46-case suite pass; full smoke PRODUCT_PASS
- Decision: SQLite BEGIN IMMEDIATE serializes retries; numeric order IDs fit numRef; PeyClient injected in FastAPI
- Why: One QR per successful business/key; cents and shared JSON contract preserved
- Failing: No failures. Timeout/crash after provider QR may leave external QR without local record; manual reconciliation required
- Commands: uak red HACK-006 assertion failure; Verify exit0 13 cases; uv run pytest -q exit0 46 cases; smoke exit0 PRODUCT_PASS; diff check exit0
- Next: Create PR then uak done HACK-006; uak next and merge approved tasks

## History
- 1795738569 | CLAIMED | dylan-3 | claim; next: Leer contratos de cobro y escribir Tests; uak red HACK-006 | Harness: unknown | Model: unknown
- 1795738806 | CLAIMED | dylan-3 | checkpoint; next: Create PR then uak done HACK-006; uak next and merge approved tasks | Harness: unknown | Model: unknown
