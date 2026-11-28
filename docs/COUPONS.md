# Cupones de alianza

Contrato HACK-053. Un cupón es un token de portador aleatorio de 256 bits;
no contiene identidad personal. Una compra pagada origina como máximo un cupón,
incluso entre alianzas distintas. Su vigencia es de siete días desde la emisión.
Los datos de ejemplo llevan `demo_data: true`.

## Dirección

Para estos cupones, **emisor = alliance.giver**, y **destinatario = el otro negocio**
de la alianza. Sólo este destinatario puede reservar el descuento. Se distingue
del código legado de alianza, cuyo `giver` es quien cobra con descuento.

La fórmula de porcentaje, redondeo hacia abajo, contribución configurada,
presupuesto y usos es la misma que en alianzas. La configuración económica es la
de la alianza: no se presenta como una medición del margen real del destinatario.

## Reclamar

`POST /api/coupons/claim`

```json
{"alliance_id":"al-ejemplo","business_id":"emisor","order_id":"orden-pagada"}
```

Alternativa por punto:

```json
{"alliance_id":"al-ejemplo","point_id":"token-del-punto"}
```

El punto debe estar activo y pertenecer al emisor. Puede acompañarse de
`order_id`; si falta, se selecciona dentro de la transacción la compra pagada más
reciente de ese negocio que todavía no tenga cupón. Un punto no crea una compra
ni convierte un cobro pendiente en pagado. Si también se proporciona
`business_id`, debe coincidir con el punto.

Respuesta 201: la misma vista pública de abajo. Sin compra pagada elegible,
o con una compra de otro negocio, 409 con motivo en español. Una segunda
reclamación del mismo comprobante devuelve 409. Un punto revocado devuelve 410.
Los campos no reconocidos y cuerpos incompletos se rechazan con 422.
La reclamación no es un reintento idempotente: el consumidor debe conservar el
token de la respuesta. Si esa respuesta se pierde después de emitirlo, esta API
no ofrece recuperación del token ni libera la compra para reclamar otro.

El modo por punto sigue el contrato público del prototipo: conocer un punto
no demuestra la identidad del comprador, y puede reclamar una compra pagada
no reclamada de ese negocio. No se debe describir este modo como autenticación
del cliente. El cliente conserva el token en su wallet; el servidor no crea
una cuenta personal.

## Consultar

`GET /api/coupons/{token}`

```json
{
  "token":"token-aleatorio",
  "alliance_id":"al-ejemplo",
  "status":"valid",
  "issuer":{"id":"emisor","name":"Negocio emisor"},
  "redeem_at":{"id":"aliado","name":"Negocio aliado"},
  "discount_pct":10.0,
  "expires_at":"2026-12-05T18:00:00+00:00",
  "demo_data":true
}
```

Ejemplo de estructura, sin transacción real. `status` es `valid`, `used`
o `expired`; la caducidad se cumple cuando `now >= expires_at`.
La vista no expone el comprobante de origen, claves de idempotencia, costos,
presupuesto, cuentas bancarias, teléfonos ni datos de pago. Las respuestas
exitosas usan `Cache-Control: no-store`. Token desconocido: 404.

## Canjear antes de generar el QR

`POST /api/coupons/{token}/redeem`

```json
{"business_id":"aliado","order_id":"clave-idempotencia-del-cobro","amount_cents":10000}
```

`amount_cents` es el importe original entero positivo, no un importe enviado a pey.
`order_id` puede ser la futura `Idempotency-Key` del cobro. Si el cobro ya existe,
se aceptan su ID o su clave, pero debe seguir pendiente, sin vencer y tener
exactamente el total descontado. Nunca se reescribe el importe de un QR emitido.

```json
{"applied":true,"original_cents":10000,"discount_cents":1000,"total_cents":9000,"currency":"MXN","demo_data":true}
```

Secuencia del consumidor:

1. Leer el cupón y mostrar negocio, porcentaje e importe estimado.
2. Al confirmar, reservarlo con `redeem` y una clave de compra estable.
3. Crear el cobro normal con `total_cents` y la misma `Idempotency-Key`.
4. Si falla la conexión o la creación del QR, repetir con **la misma clave y
   los mismos importes**. La reserva permanece consumida; no hay liberación
   automática, compensación externa ni un nuevo descuento.
5. Un reintento del mismo canje devuelve su resultado guardado aunque el
   presupuesto se haya agotado o hayan pasado siete días. Cambiar importe,
   negocio o compra no es un reintento válido.

En una sola transacción `BEGIN IMMEDIATE` se valida el estado, se comprueba que
la compra no tenga otro beneficio, se reserva presupuesto y un uso, y se marca
el cupón usado guardando los tres importes. Cualquier error revierte todo.
No se llama a pey desde el canje. La emisión y el canje concurrentes están
cubiertos con la misma base SQLite que usa el prototipo.

409: cupón usado en otra compra, vencido, negocio incorrecto, alianza inactiva,
otro beneficio en la compra, importe sin margen, usos agotados o presupuesto
insuficiente. Un fallo no consume el cupón ni el presupuesto. El QR de un cobro
a importe completo debe descartarse por el consumidor y crear una nueva compra
con el descuento: este endpoint no lo modifica ni lo cancela.

## Persistencia e interoperabilidad

La tabla propia `coupons` conserva comprobante único, dirección, vencimiento y
reserva inmutable; no modifica `db.py` ni las tablas base existentes.
Actualiza los contadores de la alianza bajo el mismo bloqueo SQLite.
Las reservas de cupones no se insertan en `referrals`, porque la atribución de
esa tabla corresponde al `giver` del flujo legado, con dirección distinta.

Antes de un canje se revisan otros cupones y las reservas de códigos legados
para el negocio y los alias ID/clave de esa compra. El endpoint legado también
comprueba, bajo su bloqueo SQLite, si la compra ya reservó un cupón y rechaza
un segundo beneficio con 409. Cuando no existe la tabla de cupones, mantiene
el flujo previo. La comprobación respeta el negocio: una clave igual en otro
negocio no identifica la misma compra.

## Verificación

```sh
uv run pytest -q app/tests/test_coupons.py app/tests/test_alliances.py
```

Reloj fijo, compras en SQLite temporal y `FakePeyClient`; ninguna prueba emite
un QR real ni llama a un proveedor externo. Se prueban vencimiento exacto,
concurrencia, negocios, presupuesto, usos, redondeo entero, privacidad,
reintentos con ID/clave y creación de un QR de ejemplo al total descontado.
También se prueban ambos órdenes de cupón/código y la carrera entre los dos
endpoints: sólo una reserva puede consumir usos y presupuesto.
