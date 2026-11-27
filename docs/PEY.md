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
- `codi.qr.payment_received`: el payload es **PLANO**, sin `data` (cobro real de 1 MXN, 2026-11-26): `{"type","amount","codiQrId","transactionId","numRef","concept","datePaid","apiKeyId","bankAccountId"?,"metadata"}`. `amount` es un número en **pesos** (1, 10.5, 150) → se convierte a centavos; `datePaid` es Unix en segundos. Ejemplo literal en https://docs.pey.mx/en/docs/webhooks/codi/qr/ y en `app/tests/test_payments_real_payload.py`.
- Un pago con `codiQrId` desconocido queda en `webhook_events` y se registra en el log (sólo `type` y `codiQrId`, sin concepto ni metadata) para diagnóstico.
- La URL del webhook se configura por API key en portal.pey.mx → necesita URL pública (deploy o túnel). Historial de entregas en portal.pey.mx/developers → "Webhook Logs".

## Regla de producto
Una orden pasa a **pagada sólo** con un webhook verificado (o consulta al proveedor), nunca por lo que diga el cliente.

## Adaptador Python (HACK-003)
- `app.services.pey.PeyClient` es un Protocol síncrono: `create_qr(amount_mxn, concept, num_ref, expiration_s) -> QrResult(id, qr_string)`.
- `HttpPeyClient(api_key, client=None)` recibe la llave desde la configuración del servidor. Un `httpx.Client` inyectado sigue siendo propiedad del consumidor. Timeout de 10 segundos, sin reintentos automáticos ni redirecciones; un timeout puede ocurrir después de crear el QR: revisar el portal antes de repetir.
- `PeyBadRequest`, `PeyRateLimited`, `PeyServerError`, `PeyUnavailable` heredan de `PeyError` y exponen `status_code`, `error_type`, `request_id`. Errores de transporte o respuesta inválida también son `PeyError`; no se incluyen cuerpos ni credenciales en sus mensajes.
- `FakePeyClient` registra los argumentos en `requests` y devuelve IDs deterministas `fake-qr-N`, con `qr_string` marcado `demo_data:true`; estos valores son sólo para pruebas, no QR CoDi pagables.
- `app.services.pey_webhook.verify_webhook(raw_body, headers, secret)` devuelve el JSON autenticado o lanza `InvalidSignature` (alias de `WebhookVerificationError`). Verifica firma y vigencia del timestamp; **no** guarda eventos. La deduplicación persistente por `webhook-id` corresponde al consumidor HACK-007.
- Tests offline: `uv run --no-project --with pytest --with httpx --with standardwebhooks pytest -q app/tests/test_pey.py`.
- Smoke **manual, sólo humano** con `PEY_API_KEY` ya exportada en su entorno: `uv run --no-project --with httpx python scripts/pey_smoke.py`. Crea **un QR real de 1 MXN**, vigente 360 s; stdout contiene sólo su `id`. No carga ni muestra `.env`. No correr en CI; este spike no acredita todavía un cobro real.

## Importes (HACK-032)
- `HttpPeyClient` envía `amount` redondeado a 2 decimales (`round(amount_mxn, 2)`), nunca `19.990000000000002`. Cobrar admite desde $0.01; si pey o el banco rechazan ese mínimo en producción, registrar aquí el mínimo real.

## Cuenta receptora por negocio (HACK-031)
**Decisión del prototipo (2026-11-26):** todos los cobros reales llegan a la cuenta CoDi de la **plataforma**. La cuenta de cada negocio es **simulada** y así se etiqueta en la UI y en la entrega. Nunca se afirma que el dinero llegó a la cuenta del negocio: la orden queda con `settlement = "simulada"` ("liquidación pendiente al negocio").

- `PUT /api/businesses/{id}/payout-account` `{clabe, mode?, pey_bank_account_id?}` valida la CLABE (18 dígitos y dígito de control, pesos 3-7-1; inválida → 422). **No se guarda la CLABE completa**: sólo banco (primeros 3 dígitos) y últimos 4. `GET` devuelve ese resumen público.
- `GET /api/orders/{id}/settlement` devuelve `simulada` o `directa` más una nota legible.
- Tablas `payout_accounts` y `order_settlements`, creadas por `app/services/payout_accounts.py`.

### Cómo pasar a real
1. Registrar la cuenta del negocio con el endpoint **Register Bank Account** de pey (ver https://docs.pey.mx; confirmar ahí la ruta y los campos, no están copiados aquí) y esperar `codiStatus: ACTIVE`.
2. Guardar el id que devuelve pey: `PUT /api/businesses/{id}/payout-account` con `mode: "pey"` y `pey_bank_account_id` (el modo `pey` exige ese id; sin él → 422).
3. Desde entonces `orders.create_order` pasa `bank_account_id` a `create_qr` y la orden queda `settlement = "directa"`. Con modo `simulated` o sin cuenta, el QR va a la cuenta de la plataforma.

> Pendiente (fuera de los Paths de HACK-031): `HttpPeyClient.create_qr` aún no envía `bankAccountId` en `POST /codi/qr`. Requiere un cambio en `app/services/pey.py` (dueño HACK-003); solicitado a la persona responsable. Hasta entonces el modo `pey` no debe activarse en producción.
