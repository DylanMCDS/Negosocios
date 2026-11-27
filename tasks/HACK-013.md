# HACK-013
ID: HACK-013
State: CLAIMED
Owner: dylan-5
Branch: feat/hack-013
Worktree: /Users/dylanmartinezcastillo/Documents/Repositorios/Hackathon/Negosocios-wt/hack-013
Worklog: worklog/WL-1795740990-dylan-5-HACK-013-hack.nUAMzg.md
Priority: P1
Paths: app/services/voice_parse.py, app/routers/voice.py, app/tests/test_voice.py, web/src/features/voz/
Depends: HACK-005, HACK-008
Verify: `uv run pytest -q app/tests/test_voice.py && npm --prefix web test -- --run src/features/voz && npm --prefix web run build`
Lease-Until: 1795743690
Updated: 1795740990
Task-Base: 949857e04d10988d3a2d7bbb856cbabe291a0467
Next: UI voz web/src/features/voz: tests first
PR: -
Evidence: -
Participants: author dylan-5 (unknown)
Events: 1
Checkpoints: 0
Sessions: 1
Last-Checkpoint: 0
