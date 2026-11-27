# DECISIONS

Coordination decisions on the claims branch.
Why: a reversible option after 15 min keeps work moving.
- 1795735415 | HACK-001 | create_app factory for testable static mount | Why: test index without web/dist
- 1795736024 | HACK-002 | Pause code edits until single writer confirmed | Why: Tests and stubs appeared during read-only reconnaissance
- 1795736534 | HACK-003 | Synchronous injected httpx adapter; no retries; preserve typed HTTP errors for non-JSON responses | Why: Match pey contract while avoiding duplicate QR requests and leaking credentials
- 1795736622 | HACK-002 | Preserved four inherited tests; added docs red and TS parity coverage | Why: Human confirmed sole writer; advisor GO plan and done
- 1795736635 | HACK-003 | Keep HACK-003 in REVIEW; report missing shared product smoke rather than edit outside Paths | Why: uak next requested full smoke; adapter Verify is green but shared adapter is absent
- 1795736774 | HACK-002 | Keep missing full product smoke adapter with skeleton task HACK-001 | Why: Adapter is outside HACK-002 Paths; no runnable app in this contract task
- 1795736821 | deadline decision/HACK-002-1795735889/1795736789 | REVERSIBLE_AND_LOG | Option: Document payment confirm as legacy 409; only signed pey webhook updates paid status; Why: IDEA flow lists confirm but integrity rule and HACK-007 require verified webhooks; no money, accounts, publishing or scope expansion.
- 1795736937 | HACK-002 | Contract complete; runtime smoke adapter requested from HACK-001 in message14 | Why: Missing adapter outside contract task Paths
- 1795737722 | deadline decision/HACK-002-1795736001/1795736901 | REVERSIBLE_AND_LOG | Option: Pause edits until one session owns this worktree; Why: Another session created app/tests/test_schemas.py and schema/db stubs during read-only reconnaissance; concurrent-writer warning confirmed; no money, accounts, publishing or scope expansion.
- 1795737917 | HACK-002 | Requested exact SHA approval via done after MERGE_WAIT rejected clean merge carry-forward | Why: Gate refused 7c349db approval for bcabc41; blackbox bug recorded
- 1795738173 | HACK-005 | build variants one at a time (pace critical, parallel cap 1) | Why: plan pace critical
- 1795738289 | HACK-003 | Serve reviewer role; no implementation assignments; review exact SHA in isolated worktree | Why: uak next offers review work; incoming HACK-008 request requires verdict before ack
- 1795738802 | deadline decision/HACK-002-1795737893/1795738793 | REVERSIBLE_AND_LOG | Option: Request review on bcabc41 through done because merge gate rejects carried approval; Why: AGENTS says main merge needs no new review; gate reports MERGE_WAIT stale SHA after clean automatic merge; no money, accounts, publishing or scope expansion.
- 1795738806 | HACK-006 | SQLite BEGIN IMMEDIATE serializes retries; numeric order IDs fit numRef; PeyClient injected in FastAPI | Why: One QR per successful business/key; cents and shared JSON contract preserved
- 1795738815 | HACK-005 | final direction = R1 v1; no breeding round (pace critical, user chose explicitly) | Why: Dylan picked v1 by looking at captures
