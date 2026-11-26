# PROJECT · Negosocios (sprint mode)

> Filled in by `/uak-setup` with the human at minute 0. uak reads the flat fields of the last block from
> the remote `main`, so a stale worktree can never change permissions.

## Event
| Field | Value |
|---|---|
| Event / challenge | Hackatón México 2026 (Pey · SpaceXAI · AI Builders MX), tema libre con CoDi + API de pey, https://hackatonmexico.com · **este sprint = prototipo**; cierre oficial de entregas 2026-12-12 23:59, postulación 2026-12-10 23:59 · producto: Negosocios (ver IDEA.md, docs/CONTEXTO-CoDi.md) |
| Start | `2026-11-26 16:59 America/Mexico_City` |
| Official deadline | `2026-11-29 23:59 America/Mexico_City` · platforms: portal pey.build (postulación + entrega) |
| Freeze | `2026-11-29 17:59` (Freeze-Epoch 1795996740) · design lock Thu 17:59 · first claim by Thu 18:59 · plan-B video Sat 08:29 |
| Clean rehearsal / plan B | `2026-11-29 21:59` |
| Internal submission | `2026-11-29 22:59` |
| Humans | `Dylan: todo` · submission owner: `Dylan` (starts at T−8 h) |
| Agents | `dylan-1, dylan-2` (Claude Code) · `dylan-3, dylan-4` (Codex) — 4 por decisión del humano |
| Machines | `MacBook de Dylan` · ports already taken: `<pendiente>` |

## Official rubric (weights sum to 100)
| ID | Criterion | Weight | Evidence in the demo |
|---|---|---:|---|
| C1 | Uso de CoDi y del API de pey (real, claro para quien paga, QR/push/enlace) | 30 | Pasos 2–3: QR CoDi real y la pantalla reacciona al webhook |
| C2 | Impacto y relevancia | 25 | Comerciante de tianguis: cobro + cierre del día |
| C3 | Ejecución técnica (calidad, solidez, seguridad) | 15 | Webhook firmado, idempotencia, llaves sólo en servidor |
| C4 | Experiencia y diseño (incluido el momento de pagar) | 15 | Pantallas bloqueadas en /uak-design-lock |
| C5 | Originalidad frente a lo que ya existe en México | 15 | Cierre del día + descuento máximo con contribución mínima |

## Event rules
| Topic | Confirmed rule | Source |
|---|---|---|
| AI use / prior code | IA permitida sin declararla. Código previo y de terceros permitido si se declara; la integración pey debe hacerse en el periodo (desde 2026-11-14) | https://hackatonmexico.com/reglas §9 |
| Data and licenses | Respetar licencias; no guardar datos que pey marca como no almacenables; credenciales nunca en repo ni cliente | https://hackatonmexico.com/reglas §8.6, §9.4 |
| Pitch and video limits | Video ≤ 3 min mostrando un cobro CoDi completo hasta la reacción al resultado; descripción ≤ 500 palabras; instrucciones de prueba ≤ 1000 palabras; deck opcional | https://hackatonmexico.com/reglas §10.1 |
| Repository requirements and disqualification rules | Integración pey real y en producción (simulada = no cumple); Demo Pública accesible sin invitación; repo opcional; nombre sin pey/CoDi como marca; entrega incompleta = no entregada | https://hackatonmexico.com/reglas §6, §10 |
| Sponsor requirements, if required by the official rules | Usar el API de pey para cobrar con CoDi (obligatorio). Bounties: se publican el 2026-11-30 | https://hackatonmexico.com/reglas §6, §15 |

## Plan B
- A video of the whole flow at `<path>` (v1 at T−50%, final at T−2 h). Use it if `<network, mic, external API>` fails.

## Executable config
A human sets `yes`. A missing field means `no`.

```text
Mode: sprint
Backlog-Proposed-Epoch: 0
Backlog-Approved: yes
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
