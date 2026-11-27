# HACK-033
ID: HACK-033
State: REVIEW
Owner: dylan-5
Branch: feat/hack-033
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-033
Worklog: worklog/WL-1795771875-dylan-2-HACK-033-hack.6P4rCI.md
Priority: P0
Paths: web/DESIGN.md, web/src/index.css, web/src/lib/ui/, web/public/design-lock/, web/index.html
Depends: HACK-022
Verify: `test -s web/DESIGN.md && ls web/public/design-lock/screens/*-1280.png && npm --prefix web test -- --run && npm --prefix web run build && bash .uak/bin/uak lint`
Lease-Until: 1795813830
Updated: 1795799430
Task-Base: f28a5352e73165d9d539db0cadf797c09779138c
Next: New session: run design-critic on 899ac2b (write .uak-shots/HACK-033/critic.txt with VERDICT: SHIP 899ac2b), then uak done HACK-033 --pr https://github.com/DylanMCDS/Negosocios/pull/34 --note 'what changed'. Human: allow --tests for nav.test.tsx, amend Paths for .uak/design/rounds/ (msg #174)
PR: https://github.com/DylanMCDS/Negosocios/pull/34
Evidence: -
Thread-Read: 181
