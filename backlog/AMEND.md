# Amended tasks (uak plan --amend)

Append-only; the last section of an ID replaces its section in the backlog. Why: Paths can grow before review.

## HACK-015 · Producción: deploy, webhook real y smoke del producto

- **Type:** integration
- **Priority:** P0
- **Estimate:** 45 min
- **Rubric / Spec:** C1, C3 · `docs/PEY.md` · reglas §6.3 (ambiente productivo)
- **Depends on:** HACK-007, HACK-009, HACK-010
- **Paths:** .uak/bin/smoke-project, .uak/bin/.smoke-project.provenance, docs/DEPLOY.md, docs/evidence/
- **Freeze-Allowed:** yes
- **Acceptance:** `bash .uak/bin/uak init-smoke` arranca la app y pide `/api/health`; se commitean `smoke-project` y su provenance., `docs/DEPLOY.md`: pasos para Dylan (crear el servicio en Render desde `render.yaml`, poner `PEY_API_KEY`/`PEY_WEBHOOK_SECRET` en Render, registrar `https://<app>/api/webhooks/pey` en portal.pey.mx, poner `Live-URL` en PROJECT.md)., Un cobro real de 1 MXN en producción pasa a "Pagado" en Cobrar y en Pagar; la evidencia (captura + `webhook-id` del log de pey) queda en el PR.
- **Test-First:** no (configuración de despliegue y prueba manual con dinero real)
- **Verify:** `bash .uak/bin/smoke-project`
- **Next step:** `bash .uak/bin/uak deploy` para ver lo que falta.

