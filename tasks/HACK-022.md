# HACK-022
ID: HACK-022
State: REVIEW
Owner: dylan-2
Branch: feat/hack-022
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-022
Worklog: worklog/WL-1795759655-dylan-2-HACK-022-hack.ifWQAB.md
Priority: P0
Paths: web/src/App.tsx, web/src/lib/ui/NavBar.tsx, web/src/features/landing/nav.ts, web/src/features/cobrar/nav.ts, web/src/features/cierre/nav.ts, web/src/features/negocio/nav.ts, web/src/features/voz/nav.ts, web/src/features/pagar/nav.ts, web/src/test/nav.test.tsx
Depends: HACK-021
Verify: `npm --prefix web test -- --run src/test/nav.test.tsx && npm --prefix web run build`
Lease-Until: 1795774188
Updated: 1795759788
Task-Base: f5c18e3bde4365482f83a5203dc72f09fd02f642
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/25; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/25
Evidence: npm --prefix web test -- --run (all web tests incl. 3 new in src/test/nav.test.tsx and earlier nav tests): passed; build exit 0; lint 0 errors; design-critic SHIP 392a88f; measured no horizontal overflow at 1280/390; red at f5c18e3 on assertion · red at f5c18e3: AssertionError: expected [] to deeply equal [ [ 'explorar', 'Explorar' ] ]
Participants: author dylan-2 (unknown); reviewer dylan-5 (claude-sonnet-5-5) approve
Events: 3
Checkpoints: 0
Sessions: 2
Last-Checkpoint: 0
Task-Tip: 392a88fb2c06ab2518db22e514c1553c004753bb
