# HACK-037
ID: HACK-037
State: REVIEW
Owner: dylan-2
Branch: feat/hack-037
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-037
Worklog: worklog/WL-1795768943-dylan-2-HACK-037-hack.82uwkI.md
Priority: P1
Paths: web/src/App.tsx, web/src/lib/ui/NavBar.tsx, web/src/features/landing/nav.ts, web/src/features/cobrar/nav.ts, web/src/features/cierre/nav.ts, web/src/features/negocio/nav.ts, web/src/features/voz/nav.ts, web/src/features/pagar/nav.ts, web/src/test/nav.test.tsx
Depends: HACK-022
Verify: `npm --prefix web test -- --run src/test/nav.test.tsx && npm --prefix web run build`
Lease-Until: 1795783461
Updated: 1795769061
Task-Base: a4bca459625f6958311de173616e6763085ca117
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/26; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/26
Evidence: npm --prefix web test -- --run (all web tests, incl. new mobile_groups_share_width_by_entry_count): passed; build exit 0; design-critic SHIP 769cd85; red at a4bca45 on assertion · red at a4bca45: AssertionError: expected [ '', '' ] to deeply equal [ '2', '1' ]
Participants: author dylan-2 (unknown)
Events: 2
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
Task-Tip: 769cd852ba450a8a9c5282901b8a39faa3c6e1f9
