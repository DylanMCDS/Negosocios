# HACK-047
ID: HACK-047
State: REVIEW
Owner: dylan-2
Branch: feat/hack-047
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-047
Worklog: worklog/WL-1795892005-dylan-2-HACK-047-hack.hXOZDN.md
Priority: P1
Paths: web/src/features/cierre/, web/src/features/voz/, web/src/lib/types.ts
Depends: HACK-011, HACK-044
Verify: `npm --prefix web test -- --run src/features/cierre src/features/voz && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795906682
Updated: 1795892282
Task-Base: c5e08a8d17a7b5f13832327eb7eeb407353b5d88
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/47; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/47
Evidence: -
Thread-Read: 258
