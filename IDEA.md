# IDEA · Negosocios

> Reto: tema libre con CoDi + API de pey · Evento: Hackatón México 2026 (https://hackatonmexico.com), cierre oficial 2026-12-12 23:59. **Este sprint: prototipo**, 2026-11-26 → 2026-11-29 23:59 America/Mexico_City. Etiquetas: **[Decided]** · **[Recommended]** · **[To validate]**.
> Contexto completo del producto: `docs/CONTEXTO-CoDi.md` (v1.0, 2026-11-15). Cada número del pitch sale de §10 con fuente.
> §4 → tareas verticales · §6 → contrato · §7 → spikes · §8 → aceptación.

## 0. Nombre y marca (fijo en T0)
- Nombre: **Negosocios** [Decided] · repo: `DylanMCDS/Negosocios` · tagline: "Cobra, entiende y crece sin efectivo" [To validate].
- Look: `<2–3 productos de referencia y color de marca>` [To validate]. La dirección visual se elige con capturas en `/uak-design-lock`.
- Renombrar después de T−50% necesita un `uak decision` humano.

## 1. Una línea
Para **comerciantes de tianguis, puestos ambulantes y negocios informales**, que **cobran en efectivo y no saben cuánto ganan realmente** (`<dato con fuente>` [To validate]), **Negosocios** les permite **cobrar con CoDi por QR o sticker NFC, ver la confirmación al instante y cerrar el día sabiendo su utilidad y cuánto descuento pueden dar**, a diferencia de **cobrar en efectivo y llevar cuentas de memoria o en libreta**.

Ventaja frente a otros equipos (ganadores previos: Varísimo = cobros por WhatsApp, Abarpay = POS para tienditas, Barrio = pedidos por voz): no es sólo un QR de cobro; junta cobro verificable + finanzas explicadas (cálculos con reglas, no inventados por la IA) + red de comercios locales con promociones que respetan una contribución mínima.

## 2. Usuarios
| Persona | Momento | Necesidad | Paso del flujo |
|---|---|---|---|
| Doña Rosa, puesto de tacos en tianguis | Hora pico, manos ocupadas | Cobrar rápido y saber que el pago llegó | 1, 2, 3 |
| Luis, cliente sin efectivo | Quiere desayunar y no trae cartera | Encontrar dónde pagar con el celular y ver a quién paga | 2, 3 |
| Doña Rosa al cerrar | Fin de la jornada | Registrar gastos sin escribir y saber cuánto ganó | 4, 5 |
| Doña Rosa planeando | Semana floja | Saber qué promoción puede pagar sin perder | 6 |

## 3. Caso de demo
`<caso real publicado con resultado conocido>` [To validate]. Propuesta mientras tanto [Recommended]: un puesto de tianguis con precio 100 MXN y costo variable 60 MXN (ejemplo de `docs/CONTEXTO-CoDi.md` §9.1); con contribución mínima de 30 MXN el descuento máximo es 10 %. Los datos de la jornada son `demo_data` declarados como simulados.

## 4. Flujo de demo (≤ 6 pasos, ≤ 3 min; cada paso = una tarea vertical)
| # | El usuario hace | Ve en pantalla | API | Prio |
|---|---|---|---|---|
| 1 | Comerciante da de alta su puesto (nombre, giro, zona) | Perfil público + QR del punto | `POST /api/businesses` | P0 |
| 2 | Comerciante crea un cobro (importe + concepto) | QR dinámico de la orden, estado "pendiente" | `POST /api/orders` | P0 |
| 3 | Cliente escanea el QR (o toca el sticker NFC) y autoriza | Receptor, importe y beneficio antes de pagar; luego **Wow:** el teléfono del comerciante suena con "Pagado 100 MXN" y ambos tienen comprobante | `GET /api/orders/{id}` · `POST /api/payments/{id}/confirm` | P0 |
| 4 | Comerciante dicta "gasté 350 en tortillas" | Campos estructurados (importe, categoría, fecha) para confirmar o corregir | `POST /api/expenses/voice` | P1 |
| 5 | Comerciante abre el cierre del día | Ventas confirmadas, gastos, utilidad estimada, pendientes y diferencias, con datos faltantes señalados | `GET /api/closing/today` | P0 |
| 6 | Comerciante simula una promoción | Descuento máximo que conserva su contribución mínima, con la fórmula explicada; activa con tope de presupuesto | `POST /api/campaigns/simulate` | P1 |

- Wow en una frase: el cliente paga desde su celular y en menos de 3 s el puesto recibe la confirmación verificada y el cierre del día se actualiza solo · segundos hasta el wow: ≤ 45.
- Cobro **real con la API de pey** [Decided]: `POST /codi/qr` genera el QR y el webhook `codi.qr.payment_received` (firma Standard Webhooks) marca la orden pagada. Ver `docs/PEY.md`. Una integración simulada no cumple las reglas (§6.2). En tests se usa un fake del cliente pey; sólo el smoke manual toca producción.
- Plan B: video grabado del cobro real (si falla pey/CoDi/red en vivo). Voz: transcripción grabada. NFC: el sticker abre la misma URL del QR; QR impreso como alternativa.

## 5. Núcleo técnico
- Método: los montos, utilidad y descuento máximo se calculan con reglas comprobables (`descuento_max = 1 − (costo_variable + contribución_mínima) / precio`). La IA **no** produce el número clave: sólo interpreta el dictado, propone categoría y explica el resultado.
- Integridad: idempotencia por `webhook-id`; una orden se marca pagada sólo con un webhook de pey verificado. La llave de pey vive sólo en el servidor.
- Validación honesta: `<pendiente>`.

## 6. Datos (contrato en `app/schemas/`)
| Entidad | Campos clave | Fuente (licencia) |
|---|---|---|
| Business | id, nombre, giro, zona, ubicación temporal + expiración | demo_data |
| Order | id, business_id, importe (centavos, MXN), concepto, estado, idempotency_key | demo_data |
| Payment | id, order_id, codiQrId, transactionId, webhook_id, monto, fecha | webhook de pey |
| Expense | id, business_id, importe, categoría, fecha, origen (voz/manual) | demo_data |
| Campaign | id, business_id, descuento, contribución mínima, presupuesto, usos | demo_data |

## 7. IA y APIs externas (cada una = spike de 30 min + fallback grabado)
| Uso | Modelo/API [To validate] | Dueño de la llave | Fallback |
|---|---|---|---|
| Dictado → gasto estructurado | Transcripción + LLM | Dylan | Captura manual + audio grabado |
| Explicación del cierre | LLM | Dylan | Texto plantilla con los mismos números |
| Mapa de comercios | `<proveedor de mapas>` | Dylan | Lista ordenada por cercanía |

## 8. Rúbrica → evidencia
| Criterio oficial | Peso | Paso/artefacto que lo prueba |
|---|---|---|
| Uso de CoDi y del API de pey | 30 | Pasos 2–3: QR real y reacción al webhook en vivo |
| Impacto y relevancia | 25 | Caso del puesto de tianguis; cierre del día |
| Ejecución técnica | 15 | Firma de webhook, idempotencia, tests |
| Experiencia y diseño | 15 | Momento de pagar claro: receptor + importe antes de autorizar |
| Originalidad | 15 | Finanzas explicadas + descuento máximo (vs. Varísimo, Abarpay, Barrio) |

## 9. Alcance
Fuera: pagos entre personas, compras colectivas, exportación contable, multi-sucursal, certificación CoDi real · Simulado con `demo_data`: historial de la jornada de ventas (el cobro de la demo es real) · Idioma de la UI: español · Ética/datos: sin datos personales reales; consentimiento explícito en el alta.

## 10. Datos citables (verificados el `<fecha>`)
| Dato | URL fuente |
|---|---|
| CoDi requiere internet y cuenta bancaria; operaciones sin comisión | https://www.codi.org.mx/secundarias/preguntas_frecuentes.html |
| Cobro de terceros requiere registro y certificación ante Banxico | https://www.banxico.org.mx/sistemas-de-pago/d/%7BA21AA19F-C855-9E64-98A4-832D9A51B2B0%7D.pdf |
