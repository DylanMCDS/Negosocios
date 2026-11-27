# Guion del video de demo (≤ 3 min)

Objetivo: mostrar **un cobro CoDi real completo hasta la reacción de la pantalla** (regla §10.1) y lo que lo hace distinto: cierre del día y descuento máximo. Grabar en celular (390 px) con la URL pública, con el servicio ya despierto.

## Antes de grabar
- Abrir https://negosocios.onrender.com 2 minutos antes (el plan gratuito se duerme).
- Tener la app del banco lista con CoDi y saldo para un cobro de $1.00.
- Cargar los datos de ejemplo del día (ventas y gastos de "Doña Rosa") para que Cierre no salga vacío.
- Modo no molestar, brillo alto, sonido del celular encendido (se oye el "Pagado").

## Guion (tiempos acumulados)
| Tiempo | Pantalla | Qué se hace | Qué se dice |
|---|---|---|---|
| 0:00–0:15 | Inicio | Mostrar la portada | "Doña Rosa vende tacos en un tianguis y cobra en efectivo. No sabe cuánto gana." |
| 0:15–1:15 | **Cobrar → QR → Pagado** | Teclear $1.00, tocar Cobrar, mostrar el QR, pagar desde la app del banco con CoDi | "Genera un QR CoDi con el API de pey. El cliente paga con su banco." Al llegar el webhook: la pantalla completa **"Pagado"**, con sonido. "Nadie tocó nada: pey avisó a nuestro servidor." |
| 1:15–1:35 | Pagar `/pagar/<id>` | Mostrar la página de pago de esa orden | "El cliente ve a quién paga y su comprobante." |
| 1:35–2:00 | Cobrar con aliado | Cobrar $100 con un código de aliado | "Un negocio vecino le manda clientes y se aplica el descuento al cobrar, sin perder dinero." |
| 2:00–2:20 | Explorar | Abrir el mapa, filtrar "Abierto ahora" | "El cliente encuentra dónde pagar con el celular." |
| 2:20–2:50 | Cierre del día | Mostrar ventas, gastos y utilidad; simular una promoción | "Al cerrar, sabe cuánto ganó. Y el descuento máximo que puede dar sin perder, con la fórmula a la vista." |
| 2:50–3:00 | Cierre | Logo / URL | "Negosocios: cobra, entiende y crece sin efectivo." |

## Qué NO decir
- No decir que las ventas del Cierre o las reseñas son reales: son datos de ejemplo.
- No nombrar pey ni CoDi como si fueran nuestra marca; decir "con CoDi" y "con el API de pey".

## Plan B (si falla pey, el banco o la red en vivo)
1. **Video grabado del cobro real** (guardar el archivo en la carpeta de entrega antes del cierre; subir una versión a las 08:29 del sábado y la final 2 h antes del cierre).
2. Evidencia del cobro real ya existente: `docs/evidence/cobro-real-pagado.png` (pantalla con "Pagado $1.00") y `docs/evidence/pey-webhook-log.png` (entrega del webhook con 200).
3. Si falla solo la voz, usar el texto escrito en la pantalla de Voz; si falla el mapa, saltar a Cierre.
4. Ensayo limpio completo: sábado 21:59 (2026-11-29).
