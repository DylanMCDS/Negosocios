# HACK-052
ID: HACK-052
State: CLAIMED
Owner: dylan-5
Branch: feat/hack-052
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-052
Worklog: worklog/WL-1795893732-dylan-5-HACK-052-hack.wNX5UT.md
Priority: P1
Paths: web/src/features/dividir/, web/src/features/cierre/, web/src/features/cobrar/, web/src/lib/api.ts
Depends: HACK-042, HACK-047, HACK-049
Verify: `npm --prefix web test -- --run src/features/dividir src/features/cierre src/features/cobrar src/lib && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795896432
Updated: 1795893732
Task-Base: d6a3c73cd3b09c58be89b4b73a1789d75c57aebd
Next: primer test rojo
PR: -
Evidence: -
Thread-Read: 296
