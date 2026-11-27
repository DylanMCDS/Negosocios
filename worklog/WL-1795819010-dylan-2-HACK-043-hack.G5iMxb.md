# worklog/WL-1795819010-dylan-2-HACK-043-hack.G5iMxb.md · HACK-043

## Live summary
- Done: Backend: settle_demo_proposals + campo demo en list_for/propose; 2 tests backend verdes (red f en 3e7339c)
- Decision: Auto-aceptar de forma perezosa al listar/consultar codigo tras DEMO_ACCEPT_SECONDS=3, sin cambiar esquema; demo = business_b.demo_data
- Why: evita job en segundo plano y migracion
- Failing: ninguna
- Commands: bash .uak/bin/q uv run pytest -q app/tests/test_alliances_demo_accept.py app/tests/test_alliances.py
- Next: frontend: tests rojos fields_show_plain_language_examples, result_sentence_updates_while_typing, active_giver_alliance_shows_copyable_code; componente web/src/lib/discount/ compartido por aliados/index.tsx y cierre/index.tsx

## History
- 1795819010 | CLAIMED | dylan-2 | claim; next: test rojo de proposal_to_demo_business_is_auto_accepted en app/tests/test_alliances_demo_accept.py | Harness: unknown | Model: unknown
- 1795819108 | CLAIMED | dylan-2 | checkpoint; next: frontend: tests rojos fields_show_plain_language_examples, result_sentence_updates_while_typing, active_giver_alliance_shows_copyable_code; componente web/src/lib/discount/ compartido por aliados/index.tsx y cierre/index.tsx | Harness: unknown | Model: unknown
