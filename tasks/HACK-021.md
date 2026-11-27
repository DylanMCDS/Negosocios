# HACK-021
ID: HACK-021
State: REVIEW
Owner: dylan-2
Branch: feat/hack-021
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-021
Worklog: worklog/WL-1795756084-dylan-2-HACK-021-hack.5RcoAA.md
Priority: P0
Paths: web/src/App.tsx, web/src/features/pagar/, web/src/features/negocio/, web/src/features/cobrar/, web/src/lib/business.ts
Depends: HACK-012
Verify: `npm --prefix web test -- --run src/features/pagar src/features/negocio src/features/cobrar && npm --prefix web run build`
Lease-Until: 1795770748
Updated: 1795756348
Task-Base: a1f8239cb904c2e9cc1fd462cf12d2f966032126
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/19; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/19
Evidence: npm --prefix web test -- --run src/features/pagar src/features/negocio src/features/cobrar: all passed (5 new named tests + 1 route test); build exit 0; lint 0 errors; design-critic SHIP c0ce916; red at a1f8239 on new tests · red at a1f8239: Received:
Participants: author dylan-2 (unknown)
Events: 2
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
Task-Tip: c0ce91646868f9efd0d0e31c2f55b32fd0a483dd
