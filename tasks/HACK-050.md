# HACK-050
ID: HACK-050
State: REVIEW
Owner: dylan-3
Branch: feat/hack-050
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-050
Worklog: worklog/WL-1795892072-dylan-3-HACK-050-hack.xIifk5.md
Priority: P1
Paths: web/src/features/explorar/
Depends: HACK-046
Verify: `npm --prefix web test -- --run src/features/explorar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795907616
Updated: 1795893216
Task-Base: c5e08a8d17a7b5f13832327eb7eeb407353b5d88
Next: Humano: Lock perdido; candidato cancelado
PR: https://github.com/DylanMCDS/Negosocios/pull/49
Evidence: RED_OK preview no dialog antes código; npm --prefix web test -- --run src/features/explorar:11 passed; npm --prefix web run build exit0; bash .uak/bin/design-lint PASS; bash .uak/bin/smoke --affected exit0 kit-only; bash .uak/bin/smoke PRODUCT_PASS exit0; Playwright real DB1280x720+390x844 PASS marker/list/Escape/outside/focus/CTA/map visible/no overflow; critic SHIP721362a; shots .uak-shots/HACK-050 · red at c5e08a8: exit 1 (no assertion line recognized: the reviewer reads the log)
Participants: author dylan-3 (unknown); reviewer dylan-5 (claude-sonnet-5-5) approve; merged-by dylan-3 (unknown)
Events: 8
Checkpoints: 2
Sessions: 2
Last-Checkpoint: 1795892892
Task-Tip: 721362a5b35b0926ed8d76f59122e988577793bb
Progress: 4 commit(s) since the claim · last: 721362a fix(explorar): separar atribución del mapa y vista previa (8 minutes ago) · 0 uncommitted tracked file(s) · at 1795893216
Progress-Head: 721362a/2262605012
Progress-Changed: 1795893216
