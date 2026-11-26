# Contexto integral del proyecto de comercio digital con CoDi

Documento de producto y base para desarrollo · Versión 1.0 · 15 de noviembre de 2026

## 1. Propósito y decisión central

Crear una plataforma que permita a una persona salir sin cartera y resolver sus compras, pagos y actividades comerciales cotidianas desde el celular, mientras los negocios reciben pagos digitales, entienden sus finanzas y participan en una red de colaboración local.

La prioridad social son los comercios de comunidades marginadas, puestos ambulantes, tianguis, negocios itinerantes e informales. El producto también debe admitir negocios establecidos, empresas grandes y sucursales mediante funciones progresivas.

CoDi es el medio de cobro inicial propuesto. La experiencia cotidiana debe reunir descubrimiento de comercios, pagos, comprobantes, beneficios, pedidos y solicitudes de dinero. La cobertura suficiente de establecimientos será tan importante como la facilidad de uso.

El efectivo queda como registro administrativo opcional para completar información financiera cuando sea necesario. La navegación principal, las métricas de adopción y los incentivos se orientan al uso digital. Las operaciones externas que el comerciante decida registrar sirven para mejorar sus estimaciones financieras.

La expresión salir sin cartera describe el objetivo de pagos y comercio. La sustitución de identificaciones oficiales, credenciales y otros documentos requiere integraciones y condiciones propias. La posibilidad de resolver todo un día dependerá de aceptación comercial, conectividad, batería y disponibilidad de los servicios financieros.

## 2. Origen, referencia y estado de la propuesta

La idea original combina cobros con CoDi, finanzas para negocios, recomendaciones inteligentes, mapa comercial, alianzas, reseñas y descuentos calculados a partir de costos y resultados. También contempla stickers NFC y movimientos de dinero entre personas.

Como referencia administrativa se utilizó el README de Handle, repositorio DonCervantes/handle-finanzas-central. Describe ingresos y egresos, flujo de caja, clientes, proveedores, categorización y asistencia con IA. Sus pagos documentados utilizan Stellar testnet y la conciliación bancaria aparece entre sus planes. La revisión realizada fue documental. La reutilización de código requerirá revisar licencia, implementación y seguridad.

Este documento integra las diez propuestas complementarias solicitadas. Define comportamiento deseado, implementación gradual y dependencias conocidas. Las etapas, entidades de datos y criterios técnicos son propuestas de diseño. La selección de proveedor financiero, stack, presupuesto, equipo, localidad y fechas sigue pendiente.

## 3. Visión ideal

En el escenario ideal existen conectividad suficiente, comercios afiliados en las actividades habituales, dispositivos compatibles, acuerdos financieros y autorizaciones aplicables.

Una persona consulta negocios abiertos, compra desayuno, paga servicios participantes, recoge pedidos y divide una cuenta con amigos usando el celular. Cada operación presenta receptor, importe y condiciones antes de autorizarse. El historial reúne comprobantes y beneficios.

El comerciante recibe pagos identificables, consulta sus ventas y costos, organiza compromisos y activa campañas sostenibles. La plataforma convierte los movimientos registrados en información comprensible, con previsiones y recomendaciones explicadas.

La red conecta comercios complementarios. Un cliente referido puede obtener un beneficio financiado por una campaña definida. La contribución económica, el costo de adquisición y la recurrencia permiten valorar la alianza.

La expansión ideal llega a varias regiones y países. Cada mercado incorpora sus medios financieros y requisitos. El directorio puede crecer internacionalmente antes que la cobertura transaccional.

## 4. Actores y permisos

| Actor | Acciones principales | Alcance de acceso |
| --- | --- | --- |
| Consumidor | Explorar, pagar, reservar, consultar movimientos, reseñar y solicitar dinero | Datos y operaciones propios |
| Dueño | Administrar negocio, costos, cobros, alianzas, empleados y reportes | Negocios bajo su control |
| Cajero o colaborador | Crear órdenes y consultar resultados de cobro | Sucursal y funciones asignadas |
| Contador o asesor | Consultar o exportar información autorizada | Permiso explícito y revocable |
| Promotor comunitario | Acompañar incorporación y capacitación | Funciones de asistencia delimitadas |
| Operador de plataforma | Verificar comercios, moderar y atender incidencias | Acceso administrativo auditable |
| Aliado financiero | Ejecutar servicios financieros según el acuerdo | Responsabilidades contractuales y regulatorias |

Una persona puede tener perfil de consumidor y administrar un negocio. Los movimientos personales y comerciales deben quedar identificados y ofrecer vistas diferenciadas.

## 5. Experiencia del consumidor

La pantalla principal propone Pagar, Explorar, Pedidos y Movimientos. El diseño debe utilizar textos breves, contraste, controles amplios y una secuencia reconocible de revisión y autorización.

### 5.1 Compra presencial

1. El comercio crea una orden con importe y concepto, o productos seleccionados.
2. El cliente escanea el QR o aproxima el teléfono al sticker NFC.
3. El sistema identifica comercio y orden. Cuando el punto tiene varias órdenes pendientes, solicita el identificador necesario para elegir la correcta.
4. Se muestran importe final, beneficio, receptor y condiciones.
5. El cliente autoriza por el mecanismo financiero habilitado.
6. El sistema recibe o consulta el resultado verificable.
7. Ambas partes reciben el estado y el comprobante correspondiente.
8. Se actualizan registros financieros, inventario si existe y beneficio de la campaña.

La compra se marca pagada después de verificar el resultado. Una captura de pantalla aportada por el cliente puede apoyar una aclaración, pero el cambio de estado depende de evidencia del servicio financiero.

### 5.2 Compra a distancia y pedidos

El consumidor consulta catálogo, disponibilidad y condiciones de entrega o recogida. Puede reservar, realizar un anticipo o completar el pago según las reglas del comercio. La app presenta importe total, anticipo, saldo, vencimiento y política de cancelación.

### 5.3 Movimientos entre personas

La visión incluye solicitudes de dinero, división de cuentas y transferencias a destinatarios verificados. Cada movimiento requiere identificación del receptor, importe, autorización y comprobación. La implementación de pagos iniciados por el usuario estará vinculada al modelo del participante financiero. Una solicitud de cobro y una transferencia iniciada libremente tienen flujos que deben validarse por separado.

### 5.4 Adopción y acceso

Los perfiles públicos pueden consultarse mediante páginas ligeras compartibles. El pago seguirá el flujo compatible que se haya validado. Instalar la aplicación aporta historial, favoritos, promociones, pedidos y gestión personal. Evitar registros largos antes de que el usuario comprenda el beneficio.

## 6. Experiencia del negocio

### 6.1 Alta progresiva

Solicitar nombre comercial, actividad, responsable, medio de contacto, ubicación o zona de operación y cuenta receptora según los requisitos de integración. Verificar identidad y titularidad de la cuenta por los mecanismos disponibles. La incorporación financiera debe coordinarse con el aliado responsable.

Permitir añadir productos, costos, horarios y colaboradores de forma gradual. Para negocios itinerantes, registrar ubicación temporal y horario con expiración. Para empresas grandes, habilitar sucursales, roles, reportes consolidados e integraciones administrativas.

### 6.2 Inicio del comerciante

- Cobrar permite crear órdenes digitales.
- Mi negocio muestra ventas, compromisos y resultados estimados.
- Registrar gasto acepta captura manual, voz o fotografía.
- Mi red reúne alianzas, pedidos compartidos y campañas.

El cierre cotidiano prioriza conciliación digital, operaciones pendientes, devoluciones, costos y compromisos. El registro de efectivo queda disponible como función secundaria cuando el dueño lo necesita.

### 6.3 Confirmación y atención

Mostrar avisos visuales y sonoros configurables con importe y referencia. Ofrecer consulta de operaciones pendientes y acceso a soporte. Los empleados deben ver lo necesario para atender cobros sin exponer toda la situación financiera del dueño.

## 7. Cobros y stickers NFC

El QR dinámico puede identificar una solicitud concreta. Un sticker NFC puede guardar un enlace o identificador de un punto de atención, mesa o comercio. El servidor resuelve el contexto y recupera la orden apropiada.

| Ubicación | Función propuesta |
| --- | --- |
| Entrada | Abrir perfil, horario y catálogo |
| Caja | Recuperar orden o iniciar selección de compra |
| Mesa | Identificar mesa y consultar cuenta |
| Mostrador de recogida | Consultar un pedido mediante autorización |
| Puesto móvil | Abrir perfil y ubicación temporal |

Una etiqueta pasiva necesita un flujo que vincule al cliente con el importe correcto. La aproximación por sí sola no autoriza el movimiento de dinero. La compatibilidad se validará por sistema operativo, dispositivo y aplicación financiera.

Cada sticker debe tener identificador revocable. El QR impreso ofrece una alternativa de acceso. La interfaz muestra el receptor antes de confirmar. El diseño debe contemplar reemplazo físico de etiquetas, enlaces alterados y pedidos simultáneos.

## 8. Finanzas y recomendaciones

### 8.1 Información necesaria

Registrar ventas digitales, costos variables, compras, gastos fijos, devoluciones, compromisos, retiros del dueño y movimientos externos que se incorporen voluntariamente. Mostrar origen y fecha de actualización de cada registro.

Distinguir dinero disponible, ingresos, utilidad estimada, cuentas por cobrar, cuentas por pagar y compromisos futuros. Un anticipo, una transferencia entre cuentas propias o un retiro personal requieren tratamiento específico.

Cuando falten movimientos externos o costos, mostrar el alcance de las estimaciones. La prioridad digital del producto debe convivir con información suficiente para recomendar de forma responsable.

### 8.2 Preguntas que debe responder

- ¿Cuánto vendí y cuánto quedó después de los costos registrados?
- ¿Qué pagos próximos necesitan reserva de dinero?
- ¿Qué productos dejan mejor contribución?
- ¿Qué gasto está aumentando?
- ¿Qué campaña puedo financiar?
- ¿Qué aliados generan compras repetidas?

### 8.3 Pagos periódicos

Detectar coincidencias de proveedor, monto y frecuencia. Pedir confirmación para convertirlas en compromisos. Permitir corregir periodicidad y registrar pagos extraordinarios. Preparar recordatorios y previsiones. La ejecución automática de cargos requiere el mecanismo financiero y autorización correspondientes.

### 8.4 Uso de IA

La IA interpreta preguntas, propone categorías, extrae datos de comprobantes y explica resultados. Los cálculos se apoyan en reglas comprobables y datos trazables. Cada recomendación debe indicar periodo, supuestos y datos faltantes.

Las propuestas que afectan dinero o condiciones comerciales requieren confirmación del responsable. El sistema conserva el registro de la recomendación, decisión y resultado. Los documentos, reseñas y mensajes externos se tratan como datos y no como instrucciones para ejecutar acciones.

## 9. Red comercial, reputación y descuentos

El mapa permite filtrar por cercanía, giro, apertura, medios digitales disponibles, accesibilidad y beneficios. La ubicación temporal expira automáticamente. El dueño elige si publica posición exacta o aproximada.

La reputación presenta señales explícitas de identidad verificada, reseñas de clientes y alianzas comerciales. Las alianzas no incrementan por sí mismas las estrellas de calidad. Cada verificación debe explicar qué fue comprobado.

Los acuerdos definen beneficio, productos, vigencia, presupuesto, financiador y forma de atribuir ventas. Los aliados reciben métricas de la colaboración y conservan privadas sus finanzas internas.

### 9.1 Criterio económico de promociones

El objetivo es conservar una contribución mínima y evaluar el beneficio total de la campaña. Una reducción de precio puede disminuir la contribución por venta. Mantener la ganancia anterior requiere financiación adicional, reducción de costos o un efecto de volumen que debe comprobarse.

Ejemplo simplificado con precio de 100 MXN y costo variable de 60 MXN.

| Descuento | Precio cobrado | Contribución antes de gastos fijos |
| --- | --- | --- |
| 0 % | 100 MXN | 40 MXN |
| 10 % | 90 MXN | 30 MXN |
| 15 % | 85 MXN | 25 MXN |

Si se exige una contribución mínima de 30 MXN, el descuento máximo simplificado es 10 %. La regla general ilustrativa es descuento máximo = 1 − (costo variable + contribución mínima) / precio. Un resultado negativo indica que el precio actual ya incumple el objetivo. Deben incorporarse otros costos e impuestos aplicables al análisis real.

Toda campaña define tope monetario, cantidad de usos y condiciones de acumulación. Reservar el beneficio mientras se procesa el pago y liberarlo al vencer o rechazarse la operación. Ajustar atribución y presupuesto al procesar devoluciones.

## 10. Diez propuestas complementarias integradas

Estas funciones forman parte del alcance completo. Su incorporación se distribuye en etapas para validar dependencias y utilidad.

### 10.1 Registro por voz con confirmación

El comerciante dicta un gasto, producto o consulta. La aplicación prepara campos estructurados y solicita revisión. Debe permitir editar importe, fecha y categoría, y ofrecer captura manual equivalente.

Criterio de aceptación: un dictado puede convertirse en registro después de confirmación, corregirse y consultarse en el historial. El reconocimiento de voz debe probarse con ruido de mercado, acentos y dispositivos de gama baja.

### 10.2 Cierre diario guiado de operación digital

Presentar cobros confirmados, solicitudes pendientes, devoluciones, gastos faltantes y compromisos próximos. Conciliar las órdenes con los resultados del proveedor y señalar diferencias. Permitir incorporar movimientos externos desde un apartado secundario.

Criterio de aceptación: el dueño identifica qué operaciones requieren aclaración y obtiene un reporte reproducible del día. El cierre puede completarse sin capturar efectivo cuando la operación es digital.

### 10.3 Promociones con presupuesto máximo

Permitir seleccionar productos, horario, vigencia, contribución mínima, presupuesto y cantidad de usos. Mostrar simulación antes de activar. El dueño autoriza y puede pausar.

Criterio de aceptación: las compras simultáneas respetan el presupuesto, el beneficio se aplica una sola vez y las devoluciones ajustan la campaña según sus reglas.

### 10.4 Compras colectivas entre aliados

Agrupar necesidades de abastecimiento, solicitar cotizaciones y distribuir pedidos, costos y entregas. Presentar ahorro esperado incluyendo transporte. Cada participante confirma su parte y paga mediante un flujo acordado.

Criterio de aceptación: cada negocio identifica su obligación, pago, cantidad y entrega. La recepción conjunta de fondos por la plataforma requeriría revisar específicamente el modelo financiero. La primera implementación puede usar pagos directos al proveedor.

### 10.5 Ubicación temporal del comercio itinerante

Publicar zona de atención, horario y disponibilidad. Permitir seguimiento voluntario y avisos solicitados por el consumidor. Ofrecer posición aproximada y desactivación inmediata.

Criterio de aceptación: la ubicación deja de presentarse como vigente al vencer el periodo y el comerciante puede retirarla antes.

### 10.6 Medición de alianzas

Registrar referencias, compras atribuidas, clientes recurrentes, costo de beneficios y contribución estimada. Definir ventana y reglas de atribución para evitar contar la misma compra en varias campañas incompatibles.

Criterio de aceptación: el reporte puede rastrearse a operaciones válidas y refleja cancelaciones y devoluciones. La correlación entre alianza y ventas se presenta como evidencia observada, evitando afirmar causalidad sin una evaluación adecuada.

### 10.7 Acompañamiento comunitario

Capacitar promotores para alta, primer cobro, lectura de reportes y atención inicial. Incorporar tutoriales breves y soporte accesible. Medir autonomía del comerciante después del acompañamiento.

Criterio de aceptación: el comerciante realiza un cobro y consulta su confirmación por cuenta propia. El promotor utiliza permisos de asistencia y nunca solicita contraseñas bancarias.

### 10.8 Accesibilidad y adaptación local

Usar controles grandes, contraste suficiente, lectura opcional, instrucciones breves y navegación consistente. Probar con personas de baja alfabetización digital y equipos accesibles. Las traducciones deben validarse con hablantes y comunidades participantes.

Criterio de aceptación: los usuarios objetivo completan registro asistido, cobro y consulta de resultados, y los flujos esenciales funcionan con tecnologías de asistencia compatibles.

### 10.9 Pedidos y apartados sencillos

Permitir catálogo ligero, reserva, disponibilidad, anticipo, saldo y recogida. Definir vencimiento y cancelación. Actualizar inventario cuando aplique.

Criterio de aceptación: cada pago queda asociado al pedido y el saldo pendiente se calcula correctamente. Los reintentos y solicitudes simultáneas no duplican reservas ni cobros.

### 10.10 Exportación administrativa y contable

Exportar movimientos, categorías, conciliación y campañas por periodo. Permitir acceso temporal a contador y revocación. Los comprobantes operativos deben identificarse por su naturaleza. La emisión de documentos fiscales requiere una integración y validación específica.

Criterio de aceptación: el archivo exportado coincide con los movimientos seleccionados y el permiso revocado deja de otorgar acceso. Los reportes incluyen ajustes y devoluciones.

## 11. Propuesta ajustada para operar en México

### 11.1 Papel inicial de la plataforma

La ruta propuesta es ofrecer software de comercio y gestión, con cobros CoDi mediante el esquema habilitado y recursos recibidos en cuentas de entidades financieras. La ejecución del pago debe quedar vinculada al participante responsable. Los registros internos representan operaciones y estados verificables.

La experiencia integrada de pagos personales se desarrolla cuando el acuerdo financiero y su alcance técnico lo permitan. La disponibilidad de una integración comercial no equivale por sí sola a autorización para prestar cualquier servicio financiero.

### 11.2 Restricciones verificadas y respuesta de diseño

| Condición | Consecuencia | Ruta propuesta |
| --- | --- | --- |
| Banxico contempla registro y certificación de desarrollos de cobro de terceros | Existe una dependencia institucional para producción | Evaluar integración existente y ruta de certificación propia [S1] |
| La funcionalidad pública de pago CoDi corresponde a participantes del SPEI | Pagar íntegramente dentro de la app depende del modelo de participación | Acuerdo con participante habilitado y validación del flujo [S1] |
| CoDi requiere internet y cuenta financiera | El pago depende de conectividad y bancarización | Alta acompañada, bajo consumo de datos y estados pendientes claros [S2] |
| NFC y apertura de aplicaciones dependen del equipo y la integración | Un sticker no garantiza una experiencia universal | Pruebas en dispositivos y QR complementario |
| Servicios de fondos de pago electrónico pueden requerir autorización | Custodiar saldos cambia el alcance legal | Definir flujo de fondos con entidad habilitada y revisión jurídica [S3] |
| Los datos personales financieros requieren consentimiento expreso salvo excepciones | Se necesitan finalidades y permisos claros | Consentimientos, minimización y accesos revocables [S4] |
| Las operaciones CoDi se describen como gratuitas | El modelo de ingresos debe distinguir los servicios contratados | Evaluar suscripciones de gestión y términos del proveedor [S2] |

La guía de Banxico describe caso de negocio, acuerdos, documentación técnica, sandbox y verificaciones. No se ha confirmado un proveedor, acceso a documentación reservada, certificación ni API universal de pago integrado.

### 11.3 Aspectos pendientes de revisión específica

- Obligaciones fiscales y permisos según actividad y municipio de los comercios.
- Requisitos de identificación y límites operativos de las cuentas elegidas.
- Alcance contractual de la integración de cobro y de pagos personales.
- Responsabilidades por aclaraciones, devoluciones y fallas.
- Tratamiento de información por proveedores de IA, mapas y soporte.
- Condiciones de promociones, protección al consumidor y publicidad.
- Modelo de pagos de compras colectivas y anticipos.

Estas revisiones deben basarse en el flujo real de fondos y datos. La síntesis anterior sirve para diseñar el producto y no sustituye una evaluación jurídica de la operación concreta.

## 12. Arquitectura funcional propuesta

| Componente | Responsabilidad |
| --- | --- |
| Aplicación de consumidor | Explorar, pagar, pedidos, movimientos y beneficios |
| Aplicación de comerciante | Cobros, costos, reportes, alianzas y colaboradores |
| Panel administrativo | Verificaciones, soporte y moderación |
| Servicio de órdenes | Importe, productos, vencimientos y estado comercial |
| Integración financiera | Solicitudes, consultas, resultados y devoluciones habilitadas |
| Registro financiero | Movimientos, ajustes, conciliación y trazabilidad |
| Motor de campañas | Elegibilidad, presupuesto, reserva y canje |
| Servicio de comunidad | Mapas, perfiles, horarios y alianzas |
| Servicio de IA | Extracción, categorización y explicación controlada |
| Notificaciones | Avisos transaccionales y preferencias |

El stack final está pendiente. La primera arquitectura puede ser un backend modular con base relacional y procesamiento de tareas, evaluando su complejidad según volumen y equipo disponible. La app móvil deberá validar los flujos NFC y bancarios requeridos. La información pública de comercios puede exponerse en una web ligera.

### 12.1 Entidades iniciales

Usuarios, negocios, sucursales, roles, cuentas vinculadas, productos, costos, órdenes, solicitudes de cobro, resultados de pago, devoluciones, movimientos financieros, compromisos, etiquetas NFC, ubicaciones temporales, alianzas, campañas, reservas de beneficios, reseñas, pedidos colectivos, consentimientos y eventos de auditoría.

Los importes deben almacenarse con precisión monetaria y moneda explícita. La asociación entre venta, solicitud, pago y devolución debe mantenerse incluso después de reintentos.

### 12.2 Integridad operativa

- Asignar identificadores únicos e idempotencia a acciones susceptibles de repetición.
- Verificar autenticidad de notificaciones según el mecanismo documentado del proveedor.
- Consultar estado antes de repetir un pago cuyo resultado sea incierto.
- Mantener historial de cambios y ajustes financieros.
- Controlar permisos por negocio y sucursal.
- Reservar inventario y presupuesto de forma consistente ante concurrencia.
- Mostrar estados de espera y reconciliar eventos recibidos fuera de orden.
- Limitar exposición de datos personales en avisos, soporte y registros técnicos.
- Cifrar comunicaciones y proteger credenciales y secretos del servidor.
- Incorporar recuperación de acceso, revocación de sesiones y respuesta ante pérdida del teléfono.

Los nombres finales de estados se ajustarán al proveedor. Como modelo inicial pueden utilizarse creada, pendiente de autorización, procesando, confirmada, rechazada, vencida y resultado por conciliar. Una devolución constituye una operación relacionada con su propio seguimiento.

## 13. Implementación por etapas

Las siguientes etapas son una propuesta. El calendario requiere definir equipo, presupuesto, proveedor y tiempos externos de integración.

| Etapa | Entregable | Funciones complementarias relacionadas | Condición de avance |
| --- | --- | --- | --- |
| 0. Investigación | Mapa de actividades cotidianas, pruebas de interfaz y modelo financiero | 7 y 8 | Comprender barreras y establecer ruta de integración |
| 1. Primera versión | Alta, cobro digital, confirmación, movimientos, perfil y mapa básico | Versiones iniciales de 2, 5, 7, 8 y 10 | Flujo completo validado y registros consistentes |
| 2. Finanzas útiles | Costos, voz, compromisos y reportes explicados | 1, 2 y 10 | Recomendaciones trazables y datos suficientes |
| 3. Red activa | Alianzas, promociones y medición | 3 y 6 | Presupuestos y atribución correctos |
| 4. Operación ampliada | Pedidos, anticipos y compras colectivas | 4 y 9 | Pagos, inventario y entregas coordinados |
| 5. Vida cotidiana | Pagos personales habilitados, más giros y más regiones | Consolidación de 1–10 | Cobertura y sostenibilidad demostradas |

El primer piloto puede explorar 20–30 negocios de una zona compacta. Es una hipótesis de tamaño, ajustable a capacidad de soporte. Priorizar variedad de actividades recurrentes, horarios y cercanía para que los consumidores puedan encadenar varias compras digitales en una misma jornada.

La promoción del piloto debe explicar con precisión qué comercios y servicios aceptan el flujo disponible. La expansión depende de uso recurrente, resolución de incidencias y sostenibilidad.

## 14. Validación y métricas

La métrica principal propuesta es la proporción de participantes que completan las compras previstas de una jornada piloto mediante pagos digitales en la red.

| Dimensión | Indicadores |
| --- | --- |
| Uso cotidiano | Compras digitales por usuario activo, días de uso y giros utilizados |
| Cobertura | Negocios activos por zona, horario y actividad |
| Experiencia | Tiempo hasta primer pago, abandono y ayuda requerida |
| Confiabilidad | Pagos conciliados, resultados inciertos, duplicados e incidencias |
| Inclusión | Comerciantes que operan de forma autónoma después del acompañamiento |
| Finanzas | Costos registrados, reportes completos y correcciones de categorías |
| Alianzas | Referencias convertidas, recurrencia, costo y contribución estimada |
| Sostenibilidad | Retención, costo de soporte e ingreso por negocio |

Definir objetivos cuantitativos después de establecer una línea base. Medir la experiencia de usuarios con equipos modestos y conectividad variable.

## 15. Modelo de ingresos propuesto

Ofrecer un nivel básico accesible y evaluar suscripciones por funciones administrativas avanzadas, múltiples sucursales, exportaciones especializadas, automatización e integraciones. Los servicios de instalación y acompañamiento pueden contratarse por organizaciones o programas de apoyo.

Las campañas patrocinadas deben indicar su carácter comercial. Sus ingresos y costos se evalúan junto con el soporte, infraestructura y condiciones del proveedor financiero. La información financiera privada conserva los usos autorizados por su titular.

## 16. Escenarios que deben probarse

1. Compra correcta por QR y por NFC en los dispositivos compatibles.
2. Dos clientes accediendo al mismo punto NFC con órdenes diferentes.
3. Interrupción de internet antes y después de autorizar un pago.
4. Notificación duplicada o recibida tarde.
5. Pago confirmado cuando la aplicación del comerciante estaba cerrada.
6. Campaña con presupuesto casi agotado y compras simultáneas.
7. Devolución parcial con beneficio previamente aplicado.
8. Ubicación temporal vencida y comercio fuera de servicio.
9. Dictado con importe ambiguo y corrección del usuario.
10. Pedido con anticipo, cancelación y actualización de disponibilidad.
11. Exportación de un periodo con ajustes y acceso revocado al contador.
12. Pérdida de teléfono y recuperación segura del acceso.
13. Recomendación financiera con costos incompletos.
14. Compra colectiva con participante que no confirma o entrega parcial.

## 17. Decisiones para la siguiente etapa

Definir nombre de producto, zona piloto, equipo, presupuesto, participante financiero y alcance móvil inicial. Realizar un mapa de la jornada de consumidores y comerciantes. Preparar prototipo de alta, cobro, confirmación, cierre digital y mapa. Confirmar formalmente las capacidades del proveedor antes de comprometer pagos integrados, automatizaciones financieras o fechas de producción.

El alcance completo conserva las diez funciones complementarias. La prioridad de diseño es permitir una jornada comercial digital sencilla, accesible y verificable.

## 18. Fuentes y alcance de la investigación

Las fuentes siguientes fueron consultadas durante la elaboración de la propuesta en esta conversación. Las condiciones técnicas, contractuales y legales deben volver a verificarse al seleccionar proveedor y preparar producción.

- **[S1] Banco de México. Guía de participación en CoDi para comercios y terceros desarrolladores.** Fundamenta la distinción entre cobro de terceros y pago por participantes, así como registro y certificación. [Documento oficial](https://www.banxico.org.mx/sistemas-de-pago/d/%7BA21AA19F-C855-9E64-98A4-832D9A51B2B0%7D.pdf).
- **[S2] CoDi. Preguntas frecuentes.** Requisitos de conexión, cuenta, comisiones y devoluciones. [Portal oficial](https://www.codi.org.mx/secundarias/preguntas_frecuentes.html).
- **[S3] Cámara de Diputados. Ley para Regular las Instituciones de Tecnología Financiera.** Referencia al artículo 22 y al marco de fondos de pago electrónico. [Texto legal](https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf).
- **[S4] Cámara de Diputados. Ley Federal de Protección de Datos Personales en Posesión de los Particulares.** Referencia al consentimiento para datos financieros o patrimoniales. [Texto legal](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf).
- **[S5] Banco de México. CoDi, Cobro Digital.** Descripción de funcionamiento, QR, NFC y aceptación del cobro. [Página oficial](https://www.banxico.org.mx/sistemas-de-pago/codi-cobro-digital-banco-me.html).
- **[S6] Handle. README del repositorio.** Referencia funcional de administración y finanzas, revisada documentalmente. [Repositorio](https://github.com/DonCervantes/handle-finanzas-central/blob/main/README.md).

Las decisiones de interfaz, etapas, arquitectura y métricas son propuestas de producto. La investigación no incluye validación comercial de un proveedor, auditoría del repositorio, pruebas de dispositivos ni autorización para operar servicios financieros.
