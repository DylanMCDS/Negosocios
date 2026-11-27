# Existing tests a human allowed to change (uak allow --tests)

Append-only. Format: - ID | epoch | human | reason. Why: a test is a spec; changing one is a human decision.

- HACK-039 | 1795800167 | dylan | El test viejo del menu rechazaba features nuevas (Aliados); se conserva Inicio primero, sin Pagar y el orden base
- HACK-035 | 1795814108 | dylan | Barra movil 5+Mas (decision de Dylan): los tests del menu deben reflejar las nuevas entradas
- HACK-046 | 1795820222 | dylan | Autorizado por Dylan (#222): actualizar explorar_opens_profile_not_payment / test de Explorar para que 'Ver negocio' abra #perfil/<id> en lugar de un cobro
