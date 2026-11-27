"""Rule-based parsing of a transcribed expense phrase (no LLM). Proposes, never saves."""
import re
from decimal import Decimal

_TOKEN = re.compile(r"\$?\d[\d,]*(?:\.\d+)?|[a-záéíóúñü]+")

_UNITS = {
    "cero": 0, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7,
    "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14,
    "quince": 15, "dieciséis": 16, "dieciseis": 16, "diecisiete": 17, "dieciocho": 18,
    "diecinueve": 19, "veinte": 20, "veintiuno": 21, "veintidós": 22, "veintidos": 22,
    "veintitrés": 23, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25,
    "veintiséis": 26, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29,
    "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60, "setenta": 70,
    "ochenta": 80, "noventa": 90,
}
_HUNDREDS = {
    "cien": 100, "ciento": 100, "doscientos": 200, "trescientos": 300, "cuatrocientos": 400,
    "quinientos": 500, "seiscientos": 600, "setecientos": 700, "ochocientos": 800,
    "novecientos": 900,
}
_NUMBER_WORDS = set(_UNITS) | set(_HUNDREDS) | {"mil"}

_CURRENCY = {"peso", "pesos", "mxn"}
_VERBS = {"gasté", "gaste", "pagué", "pague", "compré", "compre", "gastamos", "pagamos",
          "compramos", "registra", "registrar", "anota", "anotar", "gasto"}
_FILLER = {"por", "en", "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
           "para", "con", "al", "a", "y", "me", "mi", "mis", "hoy", "ayer"}

_CATEGORIES = {
    "insumos": {"tortilla", "tortillas", "masa", "harina", "carne", "pollo", "verdura", "verduras",
                "fruta", "frutas", "hielo", "queso", "aceite", "azúcar", "azucar", "refresco",
                "refrescos", "huevo", "huevos", "frijol", "frijoles", "tomate", "cebolla",
                "chile", "chiles", "pan", "leche", "arroz", "mercancía", "mercancia", "insumos"},
    "servicios": {"gas", "luz", "agua", "renta", "teléfono", "telefono", "internet", "local"},
    "transporte": {"gasolina", "pasaje", "pasajes", "flete", "taxi", "camión", "camion", "transporte"},
}


def _words_value(words: list[str]) -> int:
    total = current = 0
    for w in words:
        if w == "mil":
            total += (current or 1) * 1000
            current = 0
        elif w in _HUNDREDS:
            current += _HUNDREDS[w]
        else:
            current += _UNITS[w]
    return total + current


def _digits_cents(tok: str) -> int:
    return int((Decimal(tok.lstrip("$").replace(",", "")) * 100).to_integral_value())


def _category(words: list[str]) -> str:
    for cat, vocab in _CATEGORIES.items():
        if any(w in vocab for w in words):
            return cat
    return "otros"


def parse_expense(text: str) -> dict:
    tokens = _TOKEN.findall((text or "").lower())
    amounts: list[int] = []
    rest: list[str] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok[0].isdigit() or tok[0] == "$":
            amounts.append(_digits_cents(tok))
            i += 1
        elif tok in _NUMBER_WORDS:
            run = [tok]
            j = i + 1
            while j < len(tokens):
                if tokens[j] in _NUMBER_WORDS:
                    run.append(tokens[j])
                    j += 1
                elif tokens[j] == "y" and j + 1 < len(tokens) and tokens[j + 1] in _NUMBER_WORDS:
                    j += 1
                else:
                    break
            amounts.append(_words_value(run) * 100)
            i = j
            continue
        else:
            if tok not in _CURRENCY:
                rest.append(tok)
            i += 1
    drop = _VERBS | _FILLER
    while rest and rest[0] in drop:
        rest.pop(0)
    while rest and rest[-1] in drop:
        rest.pop()
    ambiguous = len(amounts) != 1
    return {
        "amount_cents": None if ambiguous else amounts[0],
        "category": _category(rest),
        "description": " ".join(rest),
        "ambiguous": ambiguous,
    }
