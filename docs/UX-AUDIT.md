# Auditoría de UX móvil (390×844)

Fecha: 2026-11-27 · Tarea HACK-035 · Playwright (Chromium, `isMobile`, táctil, movimiento reducido) contra el build de `web/`.
Capturas: `.uak-shots/HACK-035/` (`before-*` = rama base, `after-*` = esta rama).

**Límites de la prueba (sin adornar):** el backend no estaba disponible en este entorno, así que las respuestas de la API están simuladas en Playwright (órdenes, negocio, listas vacías). Cierre, Voz, Alta, Explorar y Aliados se recorrieron hasta ver la pantalla y medir; no se completaron de punta a punta (dictar y confirmar un gasto, simular una promoción). No se probó en un celular físico: el sonido y la vibración de "Pagado" dependen del navegador.

## Medición automática por pantalla

Se midió: elementos tocables < 44 px de alto, contenido tapado por la barra inferior (se baja al fondo y se compara con la barra) y desbordamiento horizontal.

| Pantalla | Tocables < 44 px (antes del arreglo) | Tapado por barra inferior | Desborda a lo ancho |
|---|---|---|---|
| Cobrar (vacío y con QR) | ninguno | no | no |
| Pagar `/pagar/<id>` | ninguno | no | no |
| Cierre | ninguno | no | no |
| Voz | ninguno | no | no |
| Negocio (alta) | casilla de consentimiento 24 px | no | no |
| Explorar | 2 casillas de 20 px; botones +/− del mapa 30 px | no | no |
| Aliados | ninguno | no | no |

## Flujos

| # | Flujo | Pasos / toques | Problema encontrado | Arreglo |
|---|---|---|---|---|
| 1 | Cobrar $35.50 hasta "Pagado" | Teclear 3, 5, ., 5, 0 (5 toques) + **1** toque en Cobrar = 6; tras teclear el importe, 1 | (a) El importe quedaba **debajo** del teclado: había que bajar para ver lo tecleado. (b) El botón Cobrar quedaba al final de la página, lejos del pulgar. (c) "Pagado" era un texto sobre el QR atenuado, no pantalla completa. | (a) Importe arriba, teclado debajo. (b) Barra fija `bottom-16` (justo sobre la barra inferior) con Cobrar de ancho completo. (c) "Pagado" a pantalla completa con ✓, importe y "Cobrar otra orden" (sonido y vibración ya existían). Se reserva `pb-28` para que nada quede bajo la barra. |
| 2 | Cliente abre `/pagar/<id>` | 0 toques para ver a quién paga | Sin problemas de medida a 390 px (nada tapado, sin desborde). | Sin cambios. |
| 3 | Cierre del día y simular promoción | Pantalla cargada; 4 campos | Los 4 campos ya usan teclado decimal. Simulación no recorrida de punta a punta (ver límites). | Sin cambios. |
| 4 | Dictar un gasto y confirmarlo | Pantalla cargada | Importe ya usa teclado decimal. Dictado no probado (depende del micrófono del navegador). | Sin cambios. |
| 5 | Dar de alta el puesto | 4 campos + consentimiento | La casilla de consentimiento medía 24 px de alto. CLABE ya usa teclado numérico. | La etiqueta completa mide ≥ 44 px (`min-h-11`). |
| 6 | Encontrar un negocio en Explorar | Filtros + mapa | Casillas "Abierto ahora" y "Con promoción de aliado" de 20 px. Botones +/− del mapa (Leaflet) de 30 px. | Etiquetas de ≥ 44 px. **Pendiente:** los botones +/− del mapa son de Leaflet; no se tocaron. |
| 7 | Descuento de aliado al cobrar | Escribir código + Aplicar + Cobrar | Con el nuevo diseño el campo de código y el desglose quedan bajo el teclado, y Cobrar sigue fijo y a la vista. No se recorrió con una alianza real (API simulada sin alianzas). | Código en mayúsculas (`autoCapitalize`). Sin más cambios. |

## Teclados nativos

- Montos (Cierre, Voz, Aliados, Dividir): `inputmode="decimal"`, ya estaba.
- Celular del cliente en Cobrar: era `inputmode="numeric"`; ahora `type="tel"`, `inputmode="tel"`.
- CLABE: `inputmode="numeric"`, correcto.
- El importe de Cobrar se teclea con el teclado propio de la pantalla, no con el del sistema.

## Pendiente

- Probar en un celular real (sonido y vibración de "Pagado", teclado sobre el campo Concepto).
- Recorrer de punta a punta los flujos 3, 4 y 7 con backend real.
- Botones +/− del mapa a ≥ 44 px (requiere estilos de Leaflet).
