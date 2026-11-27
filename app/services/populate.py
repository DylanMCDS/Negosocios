"""Población demo de la red: 36 negocios ficticios con perfil, alianzas, reseñas y 6 semanas de historial.

Los JSON de `app/fixtures/population/` son datos estáticos (sin CLABEs ni teléfonos completos); el historial de
ventas y gastos se genera al cargar, con semilla fija y relativo a hoy. Para regenerar los JSON:
`uv run python -m app.services.populate --write-fixtures`. Todo lleva demo_data = 1 y nunca pisa datos de usuarios.
"""
import json
import random
import sys
import uuid
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from app.db import connect, init_db
from app.schemas import Contract  # noqa: F401  (los perfiles se validan con ProfileUpdate)
from app.services import alliances, finance, network, payout_accounts, reviews
from app.services.bootstrap import ensure_demo_business

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "population"
RUN_ID = "population-v1"
HISTORY_DAYS = 42
ORDER_BASE = 900000  # ids numéricos de 6 dígitos (pey exige numRef de hasta 7): no chocan con los reales

# Giro -> productos (nombre, precio en centavos, costo variable en centavos).
PRODUCTS = {
    "Fonda": [("Comida corrida", 8500, 4800), ("Caldo de pollo", 6500, 3400), ("Agua fresca", 2500, 700), ("Postre", 3500, 1500)],
    "Tacos": [("Orden de tacos", 6000, 3200), ("Quesadilla", 4500, 2200), ("Refresco", 2200, 1100)],
    "Tortillería": [("Kilo de tortilla", 2600, 1500), ("Medio kilo", 1400, 800), ("Tostadas", 2200, 1100)],
    "Frutería": [("Kilo de manzana", 4500, 3000), ("Kilo de plátano", 2800, 1700), ("Fruta picada", 3500, 1600)],
    "Papelería": [("Copias (10)", 2000, 600), ("Cuaderno", 3800, 2200), ("Pluma", 800, 350), ("Impresión", 1000, 300)],
    "Barbería": [("Corte clásico", 9000, 1800), ("Barba", 5000, 900), ("Corte infantil", 7000, 1500)],
    "Estética": [("Corte y secado", 15000, 3500), ("Tinte", 35000, 14000), ("Manicure", 12000, 3000)],
    "Abarrotes": [("Despensa chica", 12000, 9000), ("Refresco 600 ml", 2000, 1400), ("Pan de caja", 4200, 3200)],
    "Recaudería": [("Kilo de jitomate", 3200, 2000), ("Manojo de cilantro", 1000, 500), ("Kilo de chile", 6000, 3800)],
    "Jugos": [("Jugo grande", 4500, 1800), ("Licuado", 5500, 2400), ("Torta", 5800, 3000)],
    "Tamales": [("Tamal", 2200, 1000), ("Atole", 2500, 900), ("Docena de tamales", 24000, 11000)],
    "Reparación de celulares": [("Cambio de pantalla", 65000, 38000), ("Cambio de batería", 38000, 18000), ("Mica", 8000, 1500)],
    "Costurera": [("Arreglo de bastilla", 6000, 500), ("Cierre nuevo", 9000, 2500), ("Ajuste de camisa", 8000, 700)],
    "Cerrajería": [("Copia de llave", 3500, 900), ("Apertura", 35000, 3000), ("Cambio de chapa", 55000, 28000)],
    "Flores": [("Ramo chico", 12000, 6000), ("Ramo grande", 25000, 12000), ("Maceta", 18000, 8000)],
}
NAMES = {
    "Fonda": ["Fonda Doña Chela", "Fonda El Buen Sazón", "Fonda La Güera"],
    "Tacos": ["Tacos El Compadre", "Tacos La Esquina", "Tacos Los Primos"],
    "Tortillería": ["Tortillería La Esperanza", "Tortillería El Maíz", "Tortillería San Judas"],
    "Frutería": ["Frutería Don Beto", "Frutería La Cosecha"],
    "Papelería": ["Papelería Pluma Azul", "Papelería El Estudiante", "Papelería La Tinta"],
    "Barbería": ["Barbería El Navajas", "Barbería Don Memo"],
    "Estética": ["Estética Lupita", "Estética Brillo", "Estética Rosa Mexicano"],
    "Abarrotes": ["Abarrotes Don Pepe", "Abarrotes La Preferida", "Abarrotes El Ahorro"],
    "Recaudería": ["Recaudería Doña Mary", "Recaudería La Milpa"],
    "Jugos": ["Jugos La Naranja", "Jugos y Licuados Vitamina", "Jugos El Mango"],
    "Tamales": ["Tamales Doña Tere", "Tamales El Güero"],
    "Reparación de celulares": ["Celulares Express", "Reparación Digital Memo"],
    "Costurera": ["Costura Doña Aurora", "Arreglos La Aguja"],
    "Cerrajería": ["Cerrajería El Llavero", "Cerrajería La Segura"],
    "Flores": ["Flores La Primavera", "Flores Doña Margarita"],
}
ZONES = [  # (nombre, lat, lng, itinerante?) centradas en el tianguis demo; sólo coordenadas aproximadas
    ("Tianguis de ejemplo, Centro Oriente", 19.426, -99.119, True),
    ("Mercado de ejemplo, San Juan", 19.434, -99.144, False),
    ("Calle comercial de ejemplo, Regina", 19.428, -99.139, False),
    ("Corredor de oficinas de ejemplo, Reforma", 19.429, -99.156, False),
]
CHAINS = {"Tortillería La Esperanza": 3, "Papelería Pluma Azul": 2, "Abarrotes Don Pepe": 3}  # nombre -> sucursales
VERIFIED = [
    "Verificado: visita del equipo a su local y comprobante de domicilio",
    "Verificado: cobra con CoDi desde su celular y lo comprobamos con un pago de prueba",
    "Verificado: identificación del dueño y fotografía del puesto",
    "Verificado: permiso del mercado vigente",
]
BANKS = ["BBVA", "Banorte", "Santander", "HSBC", "Banamex"]
PAIRS = [("Fonda", "Jugos"), ("Tacos", "Jugos"), ("Papelería", "Reparación de celulares"), ("Barbería", "Estética"),
         ("Tortillería", "Tacos"), ("Tortillería", "Recaudería"), ("Frutería", "Jugos"), ("Abarrotes", "Tortillería"),
         ("Tamales", "Fonda"), ("Flores", "Estética"), ("Costurera", "Estética"), ("Cerrajería", "Reparación de celulares")]
PRAISE = ["Muy rico y rápido.", "Buen precio y buena atención.", "Siempre regreso, cumplen.", "Todo limpio y fresco.", "Me lo recomendó una vecina y sí vale la pena."]
COMPLAINTS = ["Tardaron más de lo que dijeron.", "Estaba bien pero algo caro.", "Se acabó lo que quería a media tarde.", "La atención fue lenta, el producto bien.", "Esperaba más porción por el precio."]


def _slug(category: str) -> str:
    table = str.maketrans("áéíóúñ ", "aeioun-")
    return category.lower().translate(table).replace("(", "").replace(")", "")


def build_fixtures() -> tuple[list[dict], list[dict]]:
    """Datos estáticos deterministas: (negocios, alianzas)."""
    rng = random.Random("negosocios-population")
    businesses: list[dict] = []
    counters: dict[str, int] = {}
    categories = list(PRODUCTS)
    slots: list[tuple[str, str | None]] = []  # (giro, nombre fijo de cadena)
    for name, count in CHAINS.items():
        category = next(c for c, names in NAMES.items() if name in names)
        slots += [(category, name)] * count
    pool = [c for c in categories for _ in range(2)]
    rng.shuffle(pool)
    slots += [(c, None) for c in pool][: 36 - len(slots)]
    for index, (category, chain) in enumerate(slots):
        zone, lat, lng, itinerant_zone = ZONES[index % len(ZONES)]
        counters[category] = counters.get(category, 0) + 1
        n = counters[category]
        base_name = chain or NAMES[category][(n - 1) % len(NAMES[category])]
        name = f"{base_name} · {zone.split(',')[1].strip()}" if chain else base_name
        itinerant = (itinerant_zone and category not in ("Barbería", "Estética", "Cerrajería")) or (category in ("Tacos", "Jugos", "Tamales") and index % 3 == 0)
        open_h, close_h = (8, 15) if itinerant else rng.choice([(8, 18), (9, 19), (10, 20)])
        days = ["tue", "thu", "sat", "sun"] if itinerant else ["mon", "tue", "wed", "thu", "fri", "sat"]
        businesses.append({
            "id": f"pop-{_slug(category)}-{n:02d}", "name": name, "category": category, "zone": zone,
            "lat": round(lat + rng.uniform(-0.004, 0.004), 3), "lng": round(lng + rng.uniform(-0.004, 0.004), 3),
            "itinerant": itinerant, "chain": chain is not None,
            "schedule": {d: {"open": f"{open_h:02d}:00", "close": f"{close_h:02d}:00"} for d in days},
            "accepts_codi": True, "verification": VERIFIED[index % len(VERIFIED)] if index % 2 == 0 else None,
            "products": [{"name": p, "price_cents": c, "cost_cents": v} for p, c, v in PRODUCTS[category]],
            "payout": {"bank": BANKS[index % len(BANKS)], "last4": f"{(index * 7919 + 1234) % 10000:04d}"},
            "popularity": rng.choice([1, 2, 2, 3]),
        })
    by_cat: dict[str, list[dict]] = {}
    for b in businesses:
        by_cat.setdefault(b["category"], []).append(b)

    def near(origin: dict, category: str, exclude: set[str]) -> dict | None:
        options = [b for b in by_cat.get(category, []) if b["id"] not in exclude and b["id"] != origin["id"]]
        return min(options, key=lambda b: abs(b["lat"] - origin["lat"]) + abs(b["lng"] - origin["lng"]), default=None)

    deals: list[dict] = []
    used: set[tuple[str, str]] = set()
    for giver_cat, referrer_cat in PAIRS:
        for giver in by_cat.get(giver_cat, [])[:1]:
            referrer = near(giver, referrer_cat, set())
            if referrer and (referrer["id"], giver["id"]) not in used:
                used.add((referrer["id"], giver["id"]))
                deals.append(_deal(giver, referrer["id"], rng))
    for category, giver_id in (("Jugos", "rosa"), ("Tortillería", None)):
        partner = by_cat[category][0]
        if giver_id == "rosa":
            deals.append(_deal({"id": "rosa", "products": [{"name": "Orden de tacos", "price_cents": 6000, "cost_cents": 3200}]}, partner["id"], rng))
        else:
            deals.append(_deal(partner, "rosa", rng))
    return businesses, deals


def _deal(giver: dict, referrer_id: str, rng: random.Random) -> dict:
    product = giver["products"][0]
    price, cost = product["price_cents"], product["cost_cents"]
    min_contribution = round(price * 0.2)
    limit = finance.max_discount(price, cost, min_contribution)["max_discount_pct"]
    discount = max(1.0, int(limit * 0.6 * 10) / 10)  # holgura: nunca pegado al máximo
    return {"business_a": referrer_id, "business_b": giver["id"], "giver": giver["id"], "discount_pct": discount,
            "price_cents": price, "variable_cost_cents": cost, "min_contribution_cents": min_contribution,
            "budget_cents": rng.choice([20000, 30000, 40000, 50000]), "max_uses": rng.choice([20, 30, 40, 60])}


def write_fixtures() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    businesses, deals = build_fixtures()
    for name, data in (("businesses.json", businesses), ("alliances.json", deals)):
        (FIXTURES / name).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def _load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def populate(database_path: str, today: date | None = None) -> dict:
    """Carga la población una sola vez; nunca duplica ni pisa negocios que ya existan con datos de un usuario."""
    today = today or datetime.now(UTC).date()
    ensure_demo_business(database_path)
    with network.network_db(database_path):  # creates network_profiles
        pass
    conn = connect(database_path)
    try:
        init_db(conn)
        reviews.ensure_all(conn)
        payout_accounts.ensure_tables(conn)
        conn.execute("CREATE TABLE IF NOT EXISTS population_runs (id TEXT PRIMARY KEY, ran_at TEXT NOT NULL)")
        if conn.execute("SELECT 1 FROM population_runs WHERE id = ?", (RUN_ID,)).fetchone():
            return {"populated": False}
        stats = _populate(conn, today)
        conn.execute("INSERT INTO population_runs (id, ran_at) VALUES (?, ?)", (RUN_ID, datetime.now(UTC).isoformat()))
        conn.commit()
        return {"populated": True, **stats}
    finally:
        conn.close()


def _populate(conn, today: date) -> dict:
    businesses = _load("businesses.json")
    real = {r["id"] for r in conn.execute("SELECT id FROM businesses WHERE demo_data = 0")}  # son de usuarios: no se tocan
    now = datetime.now(UTC)
    mine = [b for b in businesses if b["id"] not in real]
    with conn:
        for b in mine:
            conn.execute("INSERT OR IGNORE INTO businesses (id, name, category, zone, demo_data) VALUES (?, ?, ?, ?, 1)",
                         (b["id"], b["name"], b["category"], b["zone"]))
            body = {"lat": b["lat"], "lng": b["lng"], "schedule": b["schedule"], "accepts_codi": b["accepts_codi"], "location_precision": "approximate"}
            if b["itinerant"]:  # puesto itinerante: hoy está a unos metros de su zona, con vigencia
                body["temporary_location"] = {"lat": b["lat"] + 0.001, "lng": b["lng"] - 0.001, "expires_at": (now + timedelta(hours=12)).isoformat()}
            network._store(conn, b["id"], network.ProfileUpdate.model_validate(body), True, overwrite=False)
            if b["verification"]:
                conn.execute("UPDATE network_profiles SET verified = 1, verification_text = ? WHERE business_id = ?", (b["verification"], b["id"]))
            conn.execute("INSERT OR IGNORE INTO payout_accounts (business_id, bank, last4, mode, updated_at) VALUES (?, ?, ?, 'simulated', ?)",
                         (b["id"], b["payout"]["bank"], b["payout"]["last4"], now.isoformat()))
    histories = [(b["id"], b["products"], b["popularity"]) for b in mine]
    histories.append(("rosa", [{"name": p, "price_cents": c, "cost_cents": v} for p, c, v in PRODUCTS["Tacos"]], 3))
    order_n = ORDER_BASE
    rng = random.Random("negosocios-history")
    paid: list[tuple[str, str]] = []  # (id de orden, id de negocio) para reseñas
    with conn:
        for business_id, products, popularity in histories:
            week_sales: dict[int, int] = {}
            for ago in range(HISTORY_DAYS, -1, -1):
                for _ in range(max(0, round(rng.gauss(popularity + 0.5, 1)))):
                    product = rng.choice(products)
                    qty = rng.choice([1, 1, 1, 2, 3])
                    cents = product["price_cents"] * qty
                    when = datetime.combine(today - timedelta(days=ago), datetime.min.time(), tzinfo=UTC) + timedelta(hours=rng.randint(15, 24), minutes=rng.randint(0, 59))
                    order_n += 1
                    conn.execute(
                        "INSERT OR IGNORE INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, created_at, paid_at, demo_data)"
                        " VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, 1)",
                        (str(order_n), business_id, cents, product["name"][:40], f"pop-{order_n}", (when - timedelta(minutes=1)).isoformat(), when.isoformat()))
                    paid.append((str(order_n), business_id))
                    week_sales[ago // 7] = week_sales.get(ago // 7, 0) + cents
            _expenses(conn, business_id, today, week_sales, rng)
    # propose/accept/quote open their own transactions: no transaction may be open here.
    order_n = _alliances(conn, order_n, paid, real, rng)
    with conn:
        _reviews(conn, paid, rng, today)
    return {"businesses": len(mine)}


def _expenses(conn, business_id: str, today: date, week_sales: dict[int, int], rng: random.Random) -> None:
    rows = []
    for week, sales in week_sales.items():
        rows.append(("Insumos", f"Proveedor semana {week + 1}", round(sales * 0.4), (week * 7) + 2))
    rows += [("Renta", "Renta del local o piso", 60000, 38), ("Renta", "Renta del local o piso", 60000, 8),
             ("Servicios", "Luz y agua", 15000, 20), ("Servicios", "Gas", 9000, 12), ("Transporte", "Pasajes y acarreo", 4500, 5)]
    for i, (category, description, cents, ago) in enumerate(rows):
        conn.execute(
            "INSERT OR IGNORE INTO expenses (id, business_id, amount_cents, currency, category, date, source, description, demo_data)"
            " VALUES (?, ?, ?, 'MXN', ?, ?, 'manual', ?, 1)",
            (f"pop-{business_id}-{i}", business_id, max(cents, 100), category, (today - timedelta(days=ago)).isoformat(), description))


def _alliances(conn, order_n: int, paid: list[tuple[str, str]], real: set[str], rng: random.Random) -> int:
    for deal in _load("alliances.json"):
        if {deal["business_a"], deal["business_b"]} & real:
            continue
        exists = conn.execute("SELECT 1 FROM alliances WHERE business_a = ? AND business_b = ?", (deal["business_a"], deal["business_b"])).fetchone()
        if exists:
            continue
        alliance = alliances.propose(conn, {k: deal[k] for k in ("business_a", "business_b", "giver", "discount_pct", "budget_cents", "max_uses", "price_cents", "variable_cost_cents", "min_contribution_cents")})
        alliances.accept(conn, alliance["id"])
        for k in range(rng.randint(3, 6)):  # clientes que llegaron por la alianza y ya pagaron
            ref = f"pop-ref-{alliance['id']}-{k}"
            quote = alliances.quote(conn, alliance["id"], deal["price_cents"] * rng.choice([1, 2]), ref)
            if not quote["applied"]:
                break
            order_n += 1
            when = datetime.now(UTC) - timedelta(days=rng.randint(1, 30))
            conn.execute(
                "INSERT OR IGNORE INTO orders (id, business_id, amount_cents, concept, status, idempotency_key, created_at, paid_at, demo_data)"
                " VALUES (?, ?, ?, 'Cliente referido', 'paid', ?, ?, ?, 1)",
                (str(order_n), deal["giver"], quote["total_cents"], ref, when.isoformat(), when.isoformat()))
            paid.append((str(order_n), deal["giver"]))
            conn.commit()  # the next quote/accept opens its own transaction
    return order_n


def _reviews(conn, paid: list[tuple[str, str]], rng: random.Random, today: date) -> None:
    for order_id, _ in paid:
        if rng.random() > 0.25:
            continue
        stars = rng.choices([1, 2, 3, 4, 5], weights=[2, 5, 10, 33, 50])[0]
        text = rng.choice(COMPLAINTS) if stars <= 3 else (rng.choice(PRAISE) if rng.random() < 0.5 else "")
        conn.execute("INSERT OR IGNORE INTO reviews (id, order_id, stars, text, created_at) VALUES (?, ?, ?, ?, ?)",
                     (f"rv-pop-{order_id}", order_id, stars, text, datetime.combine(today, datetime.min.time(), tzinfo=UTC).isoformat()))


if __name__ == "__main__":
    if "--write-fixtures" in sys.argv:
        write_fixtures()
        print(f"fixtures escritos en {FIXTURES}")
