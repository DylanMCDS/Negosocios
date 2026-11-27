# Datos de ejemplo de la red (HACK-036)

Todo lo que se siembra es **ficticio** y lleva `demo_data = 1` (la UI lo muestra como "Datos de ejemplo"). No hay
teléfonos, CLABEs completas ni direcciones exactas reales.

## Qué se siembra
- **36 negocios** (`pop-<giro>-NN`) en 4 zonas aproximadas de la CDMX (un tianguis, un mercado, una calle comercial y
  un corredor de oficinas), con 15 giros (fondas, tacos, tortillería, frutería, papelería, barbería, estética, abarrotes,
  recaudería, jugos, tamales, reparación de celulares, costurera, cerrajería, flores). Hay 9 puestos itinerantes (ubicación
  temporal con vigencia de 12 h al arrancar) y 3 cadenas con 2-3 sucursales.
- **Perfil de red**: ubicación aproximada, horario, acepta CoDi y sello "Verificado: …" en la mitad.
- **Cuenta receptora simulada** por negocio (`mode = simulated`, banco + últimos 4 ficticios). **Todos los cobros reales
  siguen llegando a la cuenta de la plataforma.**
- **14 alianzas activas** (12 entre negocios complementarios cercanos y 2 con `rosa`), cada una con un descuento ≈ 60 %
  del máximo sin perder (`finance.max_discount`, en centavos enteros), presupuesto, usos y referidos ya cobrados.
- **Historial de 6 semanas** de ventas pagadas y gastos (insumos semanales, renta, luz/agua, gas, transporte) por negocio,
  también para `rosa`, más **reseñas** de 1 a 5 estrellas sólo sobre órdenes pagadas (mayoría 4-5; las de 1-3 llevan texto).
- Las órdenes sembradas usan ids numéricos desde `900001` (pey exige `numRef` de 1 a 7 dígitos).

## Cómo se carga
Al arrancar, `app/routers/populate.py` llama a `populate.populate()` **sólo si `POPULATE_DEMO_DATA=1`** (el arranque por
defecto no siembra ventas ni gastos: lo exige `app/tests/test_bootstrap.py`). Es idempotente: una marca en
`population_runs` evita repetirlo, y un negocio que ya exista con `demo_data = 0` (de un usuario) no se toca ni recibe datos demo.
En producción hay que añadir `POPULATE_DEMO_DATA=1` a las variables de entorno del servicio.

## Cómo regenerarlo
Los JSON de `app/fixtures/population/` salen de `app/services/populate.py` (semilla fija):
`uv run python -m app.services.populate --write-fixtures`. Las ventas, gastos y reseñas se generan al cargar, relativas a hoy.
