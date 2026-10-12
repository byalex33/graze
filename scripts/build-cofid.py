"""Converts McCance and Widdowson's CoFID 2021 spreadsheet into src/food/cofid.json.

Source: https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
Licence: Open Government Licence v3.0. Public Health England (2021).

Usage: python3 -I scripts/build-cofid.py path/to/CoFID.xlsx [--headers]
Standard library only. Output rows: [code, name, kcal, protein, carbs, fat, unit] per 100 g,
where unit is "ml" for drinks (100 g of a drink is close enough to 100 ml) and "g" otherwise.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
SHEET = "1.3 Proximates"
OUT = Path(__file__).resolve().parent.parent / "src" / "food" / "cofid.json"


def col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_rows(xlsx: str, sheet_name: str) -> list[list[str]]:
    z = zipfile.ZipFile(xlsx)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = None
    for s in wb.find("m:sheets", NS):
        if s.get("name") == sheet_name:
            rid = s.get(REL)
            for r in rels:
                if r.get("Id") == rid:
                    target = "xl/" + r.get("Target").lstrip("/").removeprefix("xl/")
    if target is None:
        sys.exit(f"sheet {sheet_name!r} not found")
    rows = []
    for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
        cells: dict[int, str] = {}
        for c in row.findall("m:c", NS):
            v = c.find("m:v", NS)
            is_ = c.find("m:is", NS)
            if c.get("t") == "s" and v is not None:
                text = shared[int(v.text)]
            elif c.get("t") == "inlineStr" and is_ is not None:
                text = "".join(t.text or "" for t in is_.iter(f"{{{NS['m']}}}t"))
            else:
                text = v.text if v is not None else ""
            cells[col_index(c.get("r"))] = text.strip()
        if cells:
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
    return rows


def number(text: str):
    """'Tr' (trace) is 0; 'N' (present but unmeasured) and blanks are unknown."""
    if text in ("Tr", "tr"):
        return 0
    try:
        return round(float(text), 1)
    except ValueError:
        return None


# CoFID food groups that are drunk: P* beverages, Q* alcoholic drinks, BA* milks, FC fruit juices.
DRINK_GROUPS = re.compile(r"^(P|Q|BA|FC)")


def unit_for(group: str, name: str) -> str:
    return "ml" if DRINK_GROUPS.match(group) and "powder" not in name.lower() else "g"


def main() -> None:
    rows = read_rows(sys.argv[1], SHEET)
    header_at = next(i for i, r in enumerate(rows) if "Food Code" in r)
    header = rows[header_at]
    if "--headers" in sys.argv:
        print(header)
        return

    def find(pattern: str) -> int:
        matches = [i for i, h in enumerate(header) if re.search(pattern, h, re.I)]
        if not matches:
            sys.exit(f"no column matching {pattern!r} in {header}")
        return matches[0]

    code, name = find(r"^Food Code$"), find(r"^Food Name$")
    kcal, protein = find(r"^Energy \(kcal\)"), find(r"^Protein")
    carbs, fat = find(r"^Carbohydrate"), find(r"^Fat")
    group = find(r"^Group$")

    foods = []
    for r in rows[header_at + 1:]:
        if len(r) <= max(code, name, kcal, protein, carbs, fat) or not r[code] or not r[name]:
            continue
        energy = number(r[kcal])
        if energy is None:
            continue
        foods.append([r[code], r[name], round(energy), number(r[protein]), number(r[carbs]), number(r[fat]), unit_for(r[group], r[name])])

    OUT.write_text(json.dumps(foods, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(foods)} foods -> {OUT}")


if __name__ == "__main__":
    main()
