# DECISIONS

Coordination decisions on the claims branch.
Why: a reversible option after 15 min keeps work moving.
- 1795735415 | HACK-001 | create_app factory for testable static mount | Why: test index without web/dist
- 1795736024 | HACK-002 | Pause code edits until single writer confirmed | Why: Tests and stubs appeared during read-only reconnaissance
- 1795736534 | HACK-003 | Synchronous injected httpx adapter; no retries; preserve typed HTTP errors for non-JSON responses | Why: Match pey contract while avoiding duplicate QR requests and leaking credentials
- 1795736622 | HACK-002 | Preserved four inherited tests; added docs red and TS parity coverage | Why: Human confirmed sole writer; advisor GO plan and done
- 1795736635 | HACK-003 | Keep HACK-003 in REVIEW; report missing shared product smoke rather than edit outside Paths | Why: uak next requested full smoke; adapter Verify is green but shared adapter is absent
- 1795736774 | HACK-002 | Keep missing full product smoke adapter with skeleton task HACK-001 | Why: Adapter is outside HACK-002 Paths; no runnable app in this contract task
