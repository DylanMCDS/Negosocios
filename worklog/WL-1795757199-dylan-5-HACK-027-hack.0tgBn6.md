# worklog/WL-1795757199-dylan-5-HACK-027-hack.0tgBn6.md · HACK-027

## Live summary
- Done: pytest test_recurring.py 10 passed + full suite green; npm test src/features/cierre green; build exit 0; design-lint PASS; design-critic SHIP b6a1946 · red at 4f7b346: E   AssertionError: assert [{'kind': 're...onthly', ...}] == [] · red at 4f7b346: E   AssertionError: assert [{'kind': 're...onthly', ...}] == []
- Decision: Demo history via own endpoint POST /api/recommendations/demo-history; startup seeding rejected (breaks test_bootstrap expenses==0)
- Why: app/services/expenses.py is outside Paths; request #94 to human
- Failing: none open
- Commands: uv run pytest -q app/tests/test_recurring.py && npm --prefix web test -- --run src/features/cierre && npm --prefix web run build
- Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/23; run .uak/bin/smoke

## History
- 1795757199 | CLAIMED | dylan-5 | claim; next: tests primero | Harness: unknown | Model: unknown
- 1795757639 | REVIEW | dylan-5 | done; PR https://github.com/DylanMCDS/Negosocios/pull/23; evidence: uv run pytest -q app/tests/test_recurring.py 8 passed (full suite green); npm test src/features/cierre green; build exit 0; design-lint PASS; design-critic SHIP 4f7b346; shots in .uak-shots/HACK-027. OPEN: demo history via POST /api/demo/seed needs a 1-line hook in app/services/expenses.py (outside Paths, request #94); interim POST /api/recommendations/demo-history · red at 64d1e07: E   AssertionError: assert 0 > 0 · red at 64d1e07: E   AssertionError: assert 0 > 0 · red at 64d1e07: E   AssertionError: assert 0 > 0; reviewer: - | Harness: unknown | Model: unknown
- 1795757787 | REVIEW | dylan-5 | checkpoint; next: wait for review; then uak merge HACK-027; merge HACK-015 after owner window (dylan-0) | Harness: unknown | Model: unknown
- 1795758325 | REVIEW | dylan-4 | review; reject; SHA 4f7b346a979bf93e018acfb395fe3b9177afbdbd; reviewer dylan-4 | Harness: unknown | Model: unknown
- 1795758519 | REVIEW | dylan-5 | done; PR https://github.com/DylanMCDS/Negosocios/pull/23; evidence: pytest test_recurring.py 10 passed + full suite green; npm test src/features/cierre green; build exit 0; design-lint PASS; design-critic SHIP b6a1946 · red at 4f7b346: E   AssertionError: assert [{'kind': 're...onthly', ...}] == [] · red at 4f7b346: E   AssertionError: assert [{'kind': 're...onthly', ...}] == []; reviewer: - | Harness: unknown | Model: unknown
- 1795758930 | REVIEW | dylan-2 | review; reject; SHA b6a194647511b1ea35810d9475f4fce49454aada; reviewer dylan-2 | Harness: unknown | Model: unknown
