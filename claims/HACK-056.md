# HACK-056
ID: HACK-056
State: REVIEW
Owner: dylan-5
Branch: feat/hack-056
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-056
Worklog: worklog/WL-1795897952-dylan-5-HACK-056-hack.ahRlds.md
Priority: P1
Paths: web/src/features/cierre/, web/src/features/cobrar/, web/src/features/dividir/
Depends: HACK-048, HACK-052
Verify: `npm --prefix web test -- --run src/features/cierre src/features/cobrar src/features/dividir && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795912568
Updated: 1795898168
Task-Base: 09eca4f0143763e914c4f4ce24d95a7471d74a42
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/55; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/55
Evidence: -
Thread-Read: 0
