# worklog/WL-1795735309-dylan-4-HACK-003-hack.TM1Ndo.md · HACK-003

## Live summary
- Done: QR adapter, typed errors, fake, signed webhooks, manual smoke documented; 19 offline tests pass; commit 6369315
- Decision: Synchronous injected httpx adapter; no retries; preserve typed HTTP errors for non-JSON responses
- Why: Match pey contract while avoiding duplicate QR requests and leaking credentials
- Failing: No test failures; smoke exit 0 reports PRODUCT_UNVERIFIED; live smoke human-only
- Commands: uak red HACK-003: 4 assertion failures; Verify: 19 passed; smoke --affected: exit 0 PRODUCT_UNVERIFIED; git diff --cached --check: exit 0
- Next: Open PR and run uak done HACK-003 with real evidence

## History
- 1795735309 | CLAIMED | dylan-4 | claim; next: leer `docs/PEY.md`, escribir los tests con `httpx.MockTransport` y `uak red HACK-003`. | Harness: unknown | Model: unknown
- 1795735404 | CLAIMED | dylan-4 | heartbeat; lease until 1795738104 | Harness: codex | Model: gpt-6.1-sol
- 1795736323 | CLAIMED | dylan-4 | heartbeat; lease until 1795739023 | Harness: codex | Model: gpt-6.1-sol
- 1795736534 | CLAIMED | dylan-4 | checkpoint; next: Open PR and run uak done HACK-003 with real evidence | Harness: codex | Model: gpt-6.1-sol
