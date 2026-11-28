# HACK-049
ID: HACK-049
State: REVIEW
Owner: dylan-5
Branch: feat/hack-049
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-049
Worklog: worklog/WL-1795892032-dylan-5-HACK-049-hack.WSoHOM.md
Priority: P1
Paths: web/src/features/cobrar/, web/src/features/pagar/
Depends: HACK-041, HACK-010
Verify: `npm --prefix web test -- --run src/features/cobrar src/features/pagar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795906857
Updated: 1795892457
Task-Base: c5e08a8d17a7b5f13832327eb7eeb407353b5d88
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/48; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/48
Evidence: -
Thread-Read: 269
