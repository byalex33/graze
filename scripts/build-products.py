"""Builds the on-device UK product index from Open Food Facts' daily CSV export.

Source: https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
Licence: Open Database Licence (ODbL) v1.0, © Open Food Facts contributors. The index is a
derived database, so it is published under the ODbL too.

Usage: python3 -I scripts/build-products.py path/to/en.openfoodfacts.org.products.csv.gz out/dir
Standard library only. Writes products.db (SQLite with an FTS5 search table) and
products.json (version, size, MD5 and count, which the app checks for updates).

Keeps products sold in the UK that have a name and calories. Brands are tidied so
"By sainsbury's", "Sainsburys" and "Sainsbury’s" are one brand, shown the way it's most
often written. Products with the same name and brand are listed once in search (the most
scanned copy), but every barcode stays in the table so scanning still finds them.

Search terms are written the way indexTerms in src/food/product-query.ts reads queries:
lower case, accents and apostrophes dropped, "m&s" as "ms", split on anything that isn't a
letter or digit.
"""
import csv
import gzip
import hashlib
import json
import math
import re
import sqlite3
import sys
import time
import unicodedata
from collections import Counter
from pathlib import Path

UK = "en:united-kingdom"
MAX_KCAL = 950  # pure fat is ~900; anything above is a typo
# Brands that are written so differently that tidying punctuation doesn't join them.
BRAND_ALIASES = {"msfood": "ms", "marksspencer": "ms", "marksandspencer": "ms", "marksspencers": "ms", "thecoop": "coop", "cooperative": "coop"}
SCHEMA = """
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  quantity TEXT,
  product_quantity REAL,
  serving_size TEXT,
  serving_quantity REAL,
  drink INTEGER NOT NULL,
  kcal REAL NOT NULL,
  protein REAL,
  carbs REAL,
  fat REAL,
  popularity REAL NOT NULL
);
CREATE VIRTUAL TABLE search USING fts5(name, brand, content='', tokenize='unicode61 remove_diacritics 2');
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def terms(text: str) -> list[str]:
    text = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    text = re.sub(r"[’‘`']", "", text)
    text = re.sub(r"(?<=[a-z0-9])&(?=[a-z0-9])", "", text)
    return [t for t in re.split(r"[^a-z0-9]+", text) if t]


def brand_key(brand: str) -> str:
    key = "".join(terms(re.sub(r"^\s*by\s+", "", brand, flags=re.I)))
    return BRAND_ALIASES.get(key, key)


def number(value: str, most: float | None = None) -> float | None:
    try:
        n = float(value)
    except ValueError:
        return None
    if not math.isfinite(n) or n < 0 or (most is not None and n > most):
        return None
    return round(n, 2)


def read_uk_products(path: str):
    csv.field_size_limit(sys.maxsize)
    with gzip.open(path, "rt", encoding="utf-8", errors="replace", newline="") as f:
        rows = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        header = next(rows)
        col = {name: i for i, name in enumerate(header)}
        get = lambda row, name: row[col[name]] if col[name] < len(row) else ""
        for row in rows:
            if UK not in get(row, "countries_tags").split(","):
                continue
            code = get(row, "code").strip()
            name = " ".join(get(row, "product_name").split())
            brand = " ".join(get(row, "brands").split(",")[0].split())
            kcal = number(get(row, "energy-kcal_100g"), MAX_KCAL)
            if kcal is None:
                kj = number(get(row, "energy-kj_100g")) or number(get(row, "energy_100g"))
                kcal = number(str(kj / 4.184), MAX_KCAL) if kj is not None else None
            if not code or not name or kcal is None or not terms(name):
                continue
            if brand and terms(name) == terms(brand):
                continue  # the brand typed as the name: "Sainsburys" by Sainsburys
            yield {
                "code": code,
                "name": name,
                "brand": brand,
                "quantity": get(row, "quantity").strip() or None,
                "product_quantity": number(get(row, "product_quantity")),
                "serving_size": get(row, "serving_size").strip() or None,
                "serving_quantity": number(get(row, "serving_quantity")),
                "drink": int("en:beverages" in get(row, "categories_tags").split(",")),
                "kcal": round(kcal),
                "protein": number(get(row, "proteins_100g"), 100),
                "carbs": number(get(row, "carbohydrates_100g"), 100),
                "fat": number(get(row, "fat_100g"), 100),
                "scans": int(number(get(row, "unique_scans_n")) or 0),
                "modified": int(number(get(row, "last_modified_t")) or 0),
            }


def completeness(p: dict) -> int:
    return sum(p[k] is not None for k in ("protein", "carbs", "fat", "serving_quantity", "product_quantity"))


def main(source: str, out_dir: str) -> None:
    started = time.time()
    products = {}
    for p in read_uk_products(source):
        products[p["code"]] = p  # a barcode listed twice: the later row wins
    print(f"{len(products):,} UK products with a name and calories", file=sys.stderr)

    # Each brand shown the way it's most often written.
    spellings: dict[str, Counter] = {}
    for p in products.values():
        if p["brand"]:
            spellings.setdefault(brand_key(p["brand"]), Counter())[p["brand"]] += 1
    shown = {key: counts.most_common(1)[0][0] for key, counts in spellings.items()}

    # One searchable copy per name and brand: the most scanned, then most complete, then newest.
    best: dict[str, dict] = {}
    for p in products.values():
        key = brand_key(p["brand"]) if p["brand"] else ""
        p["brand"] = shown.get(key) if key else None
        p["brand_key"] = key
        dupe = "".join(terms(p["name"])) + "|" + key
        rank = (p["scans"], completeness(p), p["modified"])
        if dupe not in best or rank > best[dupe]["rank"]:
            best[dupe] = {"code": p["code"], "rank": rank}
    searchable = {b["code"] for b in best.values()}
    print(f"{len(searchable):,} after merging duplicates", file=sys.stderr)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    db_path = out / "products.db"
    db_path.unlink(missing_ok=True)
    db = sqlite3.connect(db_path)
    db.executescript(SCHEMA)
    for i, p in enumerate(sorted(products.values(), key=lambda p: p["code"]), start=1):
        db.execute(
            "INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (i, p["code"], p["name"], p["brand"], p["quantity"], p["product_quantity"], p["serving_size"],
             p["serving_quantity"], p["drink"], p["kcal"], p["protein"], p["carbs"], p["fat"],
             round(math.log1p(p["scans"]), 2)),
        )
        if p["code"] in searchable:
            brand_terms = terms(p["brand"] or "") + ([p["brand_key"]] if p["brand_key"] else [])
            db.execute("INSERT INTO search (rowid, name, brand) VALUES (?,?,?)", (i, " ".join(terms(p["name"])), " ".join(brand_terms)))
    db.execute("INSERT INTO search (search) VALUES ('optimize')")
    version = time.strftime("%Y-%m-%d", time.gmtime())
    db.executemany("INSERT INTO meta VALUES (?,?)", [("version", version), ("products", str(len(products))), ("searchable", str(len(searchable)))])
    db.commit()
    db.execute("VACUUM")
    db.close()

    data = db_path.read_bytes()
    manifest = {"version": version, "bytes": len(data), "md5": hashlib.md5(data).hexdigest(), "products": len(products)}
    (out / "products.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{db_path}: {len(data) / 1e6:.1f} MB in {time.time() - started:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
