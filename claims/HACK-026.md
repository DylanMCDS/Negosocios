# HACK-026
ID: HACK-026
State: REVIEW
Owner: dylan-2
Branch: feat/hack-026
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-026
Worklog: worklog/WL-1795770386-dylan-2-HACK-026-hack.AaQjsb.md
Priority: P0
Paths: web/src/features/aliados/, web/src/features/cobrar/
Depends: HACK-022, HACK-025
Verify: `npm --prefix web test -- --run src/features/aliados src/features/cobrar && npm --prefix web run build`
Lease-Until: 1795786174
Updated: 1795771774
Task-Base: 029eb55ab0fea7fb76e50cab6e3be10d9b903ab5
Next: if human allows (uak allow HACK-024 --tests), land the one-line nav test fix, merge HACK-024 then HACK-026; else keep looping uak next
PR: https://github.com/DylanMCDS/Negosocios/pull/30
Evidence: -
Thread-Read: 153
