# Negosocios · Entrega · Hackatón México 2026

## Descripción (≤ 500 palabras)

**Negosocios** ayuda a comerciantes de tianguis, mercados y puestos ambulantes a cobrar con CoDi sin terminal, y a entender cuánto ganaron al cerrar el día. Usa el API de pey para cobrar: el cobro de la pantalla *Cobrar* es real, con QR CoDi y webhook.

**Cómo usamos el API de pey**
1. El comerciante escribe un importe en la pantalla *Cobrar*. Nuestro servidor crea la orden y llama a `POST https://api.pey.mx/codi/qr` para generar un QR CoDi dinámico. La llave de pey vive solo en el servidor, nunca en el navegador ni en el repositorio.
2. El cliente escanea el QR con la app de su banco y autoriza el pago por CoDi.
3. pey envía el webhook `codi.qr.payment_received` a `/api/webhooks/pey`. Verificamos la firma (Standard Webhooks) y respondemos 401 si no es válida. Solo con un webhook verificado la orden pasa a "pagada"; la idempotencia es por `webhook-id`, así que un reintento no cuenta dos veces.
4. La pantalla del comerciante, que consulta la orden, cambia a **"Pagado"** a pantalla completa, con sonido y vibración, sin que nadie toque nada.

Evidencia del primer cobro real (26 nov 2026): $1.00 MXN pagado desde una app bancaria, con la entrega del webhook respondida 200. Capturas en `docs/evidence/` y detalle en `docs/DEPLOY.md`.

**Qué más hace**
- **Cierre del día:** ventas confirmadas, gastos, utilidad estimada y pendientes. Los números salen de reglas comprobables, no de un modelo de lenguaje.
- **Descuento máximo sin perder:** el comerciante simula una promoción y ve el descuento más alto que conserva su contribución mínima, con la fórmula explicada.
- **Aliados:** descuentos entre negocios cercanos, con tope de presupuesto, que se aplican al cobrar.
- **Gastos por voz:** se dicta "gasté 350 en tortillas" y se confirma o corrige antes de guardar.
- **Explorar:** mapa de negocios cercanos que aceptan CoDi, para el cliente.
- **Mis puestos:** una misma persona puede tener varios puestos y cambiar entre ellos con un toque.

**Honestidad sobre los datos:** los ~36 negocios, las ventas de 6 semanas, las reseñas y las alianzas de la red son datos de ejemplo y están marcados como tal en la interfaz ("Datos de ejemplo"). Las cuentas receptoras de esos negocios son simuladas; los cobros reales llegan a la cuenta de la plataforma.

## Instrucciones de prueba (≤ 1000 palabras)

**URL pública:** https://negosocios.onrender.com (sin invitación ni cuenta).

> El servicio corre en el plan gratuito de Render y se duerme tras 15 minutos sin uso. Abre la URL y espera 1–2 minutos la primera vez.

**Probar el cobro (lo principal)**
1. Entra a **Cobrar** (el botón central de la barra inferior en celular; la barra superior en escritorio). Se usa el puesto de ejemplo "Tacos de Doña Rosa (demo)".
2. Teclea un importe y toca **Cobrar**. Aparece el QR CoDi de la orden con estado "Pendiente".
3. Escanea el QR con la app de tu banco (CoDi) y autoriza. El importe es real: usa montos pequeños, por ejemplo $1.00.
4. La pantalla cambia a **Pagado** por sí sola cuando llega el webhook de pey.
5. El cliente también puede abrir la página de pago de la orden (`/pagar/<id>`) para ver a quién paga y su comprobante.

**Probar el resto (sin dinero)**
- **Cierre:** muestra la jornada del puesto de ejemplo y el simulador de promoción (precio, costo y ganancia mínima).
- **Más → Voz:** dicta o escribe "gasté 350 en tortillas" y confirma; el gasto aparece en *Cierre*.
- **Explorar:** mapa y lista de negocios de ejemplo. Los filtros "Abierto ahora" y "Con promoción de aliado" funcionan.
- **Más → Aliados:** alianzas de ejemplo y su simulación.
- **Más → Negocio:** da de alta tu propio puesto (nombre, giro, zona). Es opcional y puedes tener varios en **Mis puestos**.

**Qué esperar de los datos:** todo lo marcado "Datos de ejemplo" o "(demo)" es ficticio. Cobrar usa pey de verdad; si el banco no completa el pago, la orden se queda en "Pendiente".

## Componentes previos y de terceros

- **API de pey y CoDi** (cobro, QR, webhook): se integró en el periodo del evento (desde el 2026-11-14).
- **Bibliotecas de código abierto:** FastAPI, Pydantic, httpx, standardwebhooks y uvicorn (servidor); React, Tailwind CSS, `qrcode`, Leaflet, Phosphor Icons y Motion (interfaz).
- **Mapa:** © colaboradores de OpenStreetMap (ODbL), con Leaflet.
- **Capturas e ilustraciones de la landing:** propias; el toldo es un SVG propio. Detalle y fuentes en `docs/CREDITS.md`.
- **Código previo:** [PENDIENTE: Dylan confirma que no se reutilizó código de proyectos anteriores; el repositorio empezó el 2026-11-26.]
- **Herramientas de IA:** el desarrollo se hizo con agentes de código (Claude Code y Codex). La IA no calcula ningún importe, utilidad ni descuento.

## Integrantes

- Dylan Martinez (responsable de la entrega).
- [PENDIENTE: Dylan confirma si hay más integrantes y el contacto para la entrega.]
