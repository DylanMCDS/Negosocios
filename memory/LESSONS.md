# Lessons (uak learn)

Append-only. Format: - N | epoch | agent | task | paths | text. `uak recall` and `uak next` show the ones for your paths.

- 1 | 1795757456 | dylan-5 | HACK-027 | app/services/recurring.py,app/routers/recommendations.py,app/fixtures/expenses_history_demo.json,app/tests/test_recurring.py,web/src/features/cierre/ | tests that enter TestClient(app) without DATABASE_PATH now create data/negosocios.db (HACK-019 startup hook) · app/tests, repo root · set DATABASE_PATH via monkeypatch in tests; never git add -A at the repo root (stage app/ and web/src only)
- 2 | 1795758901 | dylan-3 | HACK-025 | app/services/alliances.py,app/routers/alliances.py,app/services/reviews.py,app/routers/reviews.py,app/tests/test_alliances.py,app/tests/test_reviews.py | Beneficios por orden: normaliza ID y clave de idempotencia a la misma identidad almacenada antes de deduplicar. Comprueba contribución mínima en centavos: redondear el porcentaje hacia arriba puede romper el límite.
