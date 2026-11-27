# Deploy · Negosocios en producción

**URL pública:** https://negosocios.onrender.com · Render (plan Free, Docker, región Oregon) · Blueprint `render.yaml`, rama `main`, auto-deploy en cada merge.

## Cómo está montado
- Un solo servicio: FastAPI sirve `/api` y el build de React (`web/dist`). Health check: `GET /api/health` → `{"status":"ok"}`.
- Variables en Render → Environment (nunca en el repo): `PEY_API_KEY`, `PEY_WEBHOOK_SECRET`, `PUBLIC_BASE_URL=https://negosocios.onrender.com`.
- Webhook registrado en portal.pey.mx → Desarrollador → ⚙️ de la API key: `https://negosocios.onrender.com/api/webhooks/pey` (firma Standard Webhooks; sin firma válida responde 401).
- La API key y su webhook deben ser de **la misma cuenta de pey** y la key debe estar conectada a la cuenta CoDi que recibe el dinero.

## Limitaciones conocidas (plan Free)
- **Se duerme tras 15 min sin uso**: abrir la URL 1–2 min antes de una demo o grabación.
- **La base SQLite vive en el contenedor y se reinicia en cada deploy.** El puesto demo `rosa` se crea solo al arrancar (HACK-019); las ventas y gastos demo se cargan con `POST /api/demo/seed`. Para persistir: Render → Disk montado en `/app/data` (de pago).

## Evidencia del cobro real (2026-11-26)
- Cobro CoDi real de **$1.00 MXN** creado desde la pantalla Cobrar (`POST /api/orders` → `POST https://api.pey.mx/codi/qr`).
- Pagado desde una app bancaria con CoDi; pey envió `codi.qr.payment_received` al webhook; la orden pasó a **"Pagado $1.00"** en Cobrar sin intervención manual.
- Captura de la pantalla Cobrar en producción con **"Pagado $1.00"**: [`docs/evidence/cobro-real-pagado.png`](evidence/cobro-real-pagado.png).
- Log de webhook de pey en portal.pey.mx (entrega con respuesta **200**, `webhook-id` `msg_8390ab6caef111e8e90fea126…`, 26 nov 2026): [`docs/evidence/pey-webhook-log.png`](evidence/pey-webhook-log.png).
- El comprobante bancario no se publica en el repo porque contiene nombres y números de cuenta; Dylan lo conserva para la entrega.

## Lecciones del primer cobro
1. La pantalla Cobrar usa el negocio `rosa`: en una base vacía daba 404 → corregido en HACK-019.
2. El payload real de pey es **plano** (`type`, `amount`, `codiQrId`, `transactionId`…), no anidado en `data` → corregido en HACK-020.
3. Un QR creado con la key de otra cuenta cobra a esa otra cuenta y su webhook nunca llega aquí: revisar el **destino** en la app bancaria antes de pagar.

## Comprobación rápida
```bash
curl -s https://negosocios.onrender.com/api/health          # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://negosocios.onrender.com/api/webhooks/pey   # 401 sin firma
bash .uak/bin/smoke-project                                  # arranca la app local y pide /
```
