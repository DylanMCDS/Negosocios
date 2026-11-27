# HACK-034
ID: HACK-034
State: REVIEW
Owner: dylan-2
Branch: feat/hack-034
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-034
Worklog: worklog/WL-1795813448-dylan-2-HACK-034-hack.RrPALB.md
Priority: P0
Paths: web/src/features/landing/, web/public/landing/, docs/CREDITS.md
Depends: HACK-033
Verify: `npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint`
Lease-Until: 1795828598
Updated: 1795814198
Task-Base: f594e9bdd5d202a8688dcd43f754bd7d90cb79de
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/37; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/37
Evidence: npm --prefix web test -- --run src/features/landing && npm --prefix web run build && bash .uak/bin/design-lint exit 0; 5/5 tests landing (shows_value_line_and_demo_cta, shows_real_app_screens, images_have_alt_text); imagenes WebP <200 KB con alt; sin desborde a 390 y 1280; design-critic SHIP 2a5d7d8; nav de 9 entradas a cargo de HACK-035 · red at f594e9b: AssertionError: expected false to be true // Object.is equality
Participants: author dylan-2 (unknown)
Events: 3
Checkpoints: 1
Sessions: 1
Last-Checkpoint: 1795813742
Task-Tip: 2a5d7d8bf23b8e0c9cf777735ab99310a3fefabd
