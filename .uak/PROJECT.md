# PROJECT · Negosocios (sprint mode)

> Filled in by `/uak-setup` with the human at minute 0. uak reads the flat fields of the last block from
> the remote `main`, so a stale worktree can never change permissions.

## Event
| Field | Value |
|---|---|
| Event / challenge | `<pendiente: nombre, reto, URL oficial>` · producto: Negosocios (ver IDEA.md, docs/CONTEXTO-CoDi.md) |
| Start | `2026-11-26 16:59 America/Mexico_City` |
| Official deadline | `2026-11-29 23:59 America/Mexico_City` · platforms: `<pendiente>` |
| Freeze | `2026-11-29 17:59` (Freeze-Epoch 1795996740) · design lock Thu 17:59 · first claim by Thu 18:59 · plan-B video Sat 08:29 |
| Clean rehearsal / plan B | `2026-11-29 21:59` |
| Internal submission | `2026-11-29 22:59` |
| Humans | `Dylan: todo` · submission owner: `Dylan` (starts at T−8 h) |
| Agents | `dylan-1, dylan-2` (Claude Code) · `dylan-3, dylan-4` (Codex) — 4 por decisión del humano |
| Machines | `MacBook de Dylan` · ports already taken: `<pendiente>` |

## Official rubric (weights sum to 100)
| ID | Criterion | Weight | Evidence in the demo |
|---|---|---:|---|
| C1 | `<criterion>` | `<%>` | `<step or artifact>` |

## Event rules
| Topic | Confirmed rule | Source |
|---|---|---|
| AI use / prior code | `<...>` | `<URL>` |
| Data and licenses | `<...>` | `<URL>` |
| Pitch and video limits | `<duration and format for each>` | `<URL>` |
| Repository requirements and disqualification rules | `<...>` | `<URL>` |
| Sponsor requirements, if required by the official rules | `<... or none>` | `<URL>` |

## Plan B
- A video of the whole flow at `<path>` (v1 at T−50%, final at T−2 h). Use it if `<network, mic, external API>` fails.

## Executable config
A human sets `yes`. A missing field means `no`.

```text
Mode: sprint
Backlog-Proposed-Epoch: 0
Backlog-Approved: no
Autonomy: yes
Auto-Merge: yes
Review-Mode: claims
Plan-Channel: claims
Freeze-Epoch: 1795996740
Lease-Seconds: 2700
Review-Lease-Seconds: 14400
Events-Per-Session: 100
Checkpoint-Percent: 60
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
Merge-Adopt-Seconds: 300
Max-Parallel-Subagents: 4
Opus-Subagents-Per-Session: 2
Pace: auto
Subagent-Hard-Cap: 6
Strong-Hard-Cap: 3
Subagents-Per-Session: 40
Subagents-Per-Machine: 8
Subagent-Burst-Per-Minute: 6
Max-Worktree-Agents: 6
Blackbox: on
Live-URL: -
Additive-Paths: -
Test-First: yes
```
