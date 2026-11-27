# HACK-013
ID: HACK-013
State: REVIEW
Owner: dylan-5
Branch: feat/hack-013
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-013
Worklog: worklog/WL-1795740990-dylan-5-HACK-013-hack.nUAMzg.md
Priority: P1
Paths: app/services/voice_parse.py, app/routers/voice.py, app/tests/test_voice.py, web/src/features/voz/
Depends: HACK-005, HACK-008
Verify: `uv run pytest -q app/tests/test_voice.py && npm --prefix web test -- --run src/features/voz && npm --prefix web run build`
Lease-Until: 1795755677
Updated: 1795741277
Task-Base: 949857e04d10988d3a2d7bbb856cbabe291a0467
Next: Another agent reviews https://github.com/DylanMCDS/Negosocios/pull/15; run .uak/bin/smoke
PR: https://github.com/DylanMCDS/Negosocios/pull/15
Evidence: -
Thread-Read: 61
