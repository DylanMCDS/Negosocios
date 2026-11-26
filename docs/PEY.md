# API de pey · lo que los agentes necesitan (leído 2026-11-26)

Fuente: https://docs.pey.mx/llms.txt y páginas enlazadas. Si algo no cuadra, la documentación oficial manda.

## Reglas del hackatón que dependen de pey (hackatonmexico.com/reglas §6.2, §8.6)
- La integración debe ser **real y demostrable**: generar al menos un Mensaje de Cobro CoDi (QR, push o enlace) con la API y **reaccionar a su resultado** (webhook). Simulada o decorativa = no cumple.
- Debe funcionar en **ambiente productivo** (no hay sandbox todavía; las llaves son `live`, dinero real: usar importes chicos).
- La llave vive **sólo en el servidor**, en `.env` (`PEY_API_KEY`, `PEY_WEBHOOK_SECRET`). Nunca en el cliente ni en el repo. El humano la pone; los agentes no la leen ni la piden.
- Hay límites de solicitudes: nada de pruebas de carga. Los tests usan un **fake** del cliente pey; sólo el smoke manual toca la API real.

## Base
- URL: `https://api.pey.mx` · Auth: `Authorization: Bearer <PEY_API_KEY>` · Montos en MXN · IDs ULID.

## Crear QR CoDi — `POST /codi/qr` → 201
Body: `amount` (MXN, ≥0; 0 = el pagador escribe el monto), `concept` (≤40 chars), `expiration` (s; 0 = nunca, mínimo 360), `numRef` (`^[0-9]{1,7}$`), `generateImage` (bool, más lento), `bankAccountId` (opcional), `metadata` (≤50 pares escalares, se devuelven como string).
Respuesta: `{ id (IDC de Banxico), qrString, qrImage? }`. Renderizar `qrString` como QR en el cliente (ERROR_CORRECT_M).
Errores: 400 `INVALID_REQUEST|INVALID_AMOUNT|INVALID_PARAMETER|INVALID_STATE|PEY_CONSISTENCY_ERROR`, 429 `CALL_LIMIT_REACHED`, 500, 503. Todos con `error.requestId`.
Un QR se puede pagar más de una vez hasta expirar → para una orden, usar `expiration` (≥360) y asociar el pago por `codiQrId`/`numRef`.

## Otros endpoints
- `POST /codi/...` push notification a un teléfono (CoDi push) → webhook `codi.pn.payment_received`.
- Payment links (CoDi o tarjeta) → webhook `payment_link.status_updated` (`pending|processing|paid`, con `clientReferenceId`).
- Ver https://docs.pey.mx/en/docs/api/create-push-notification/ y /create-payment-link/.

## Webhooks
- Firma **Standard Webhooks** (https://www.standardwebhooks.com/): verificar con el cuerpo **crudo** y los headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`) usando `PEY_WEBHOOK_SECRET` (`whsec_...`). SDKs oficiales en Python/JS/etc.
- `webhook-id` es la llave de **idempotencia**: guardar y descartar repetidos.
- `codi.qr.payment_received`: payload con `amount`, `codiQrId` (IDC), `concept`, `numRef`, `transactionId`.
- La URL del webhook se configura por API key en portal.pey.mx → necesita URL pública (deploy o túnel). Historial de entregas en portal.pey.mx/developers → "Webhook Logs".

## Regla de producto
Una orden pasa a **pagada sólo** con un webhook verificado (o consulta al proveedor), nunca por lo que diga el cliente.
