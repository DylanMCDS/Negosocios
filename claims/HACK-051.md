# HACK-051
ID: HACK-051
State: REVIEW
Owner: dylan-2
Branch: feat/hack-051
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-051
Worklog: worklog/WL-1795893622-dylan-2-HACK-051-hack.jABL4f.md
Priority: P1
Paths: web/src/features/explorar/
Depends: HACK-050, HACK-038
Verify: `npm --prefix web test -- --run src/features/explorar && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795912150
Updated: 1795897750
Task-Base: d6a3c73cd3b09c58be89b4b73a1789d75c57aebd
Next: Humano: Edits a file outside Paths: web/src/features/perfil/ProfileView.tsx (Paths of HACK-046). Revert that file on the branch (git checkout origin/main -- web/src/features/perfil/ProfileView.tsx), or the human merges the PR
PR: https://github.com/DylanMCDS/Negosocios/pull/52
Evidence: -
Thread-Read: 331
