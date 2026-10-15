"""
Extrae medias mensuales Sentinel-5P OFFL L3 (CO, NO2, SO2) recortadas a Nuevo León.

Requisitos:
  pip install earthengine-api
  earthengine authenticate

Uso:
  python scripts/fetch_s5p_gee.py            # extracción completa 2019-01 → mes actual
  python scripts/fetch_s5p_gee.py --hourly   # verificación cada hora (meses recientes)

Escribe public/data/s5p_nl_monthly.csv y public/data/status.json, que la app
consulta cada hora para cargar columnas nuevas sin recompilar.

Colecciones (solo contaminación de aire):
  COPERNICUS/S5P/OFFL/L3_NO2  tropospheric_NO2_column_number_density
  COPERNICUS/S5P/OFFL/L3_SO2  SO2_column_number_density
  COPERNICUS/S5P/OFFL/L3_CO   CO_column_number_density
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import time
from pathlib import Path

import ee

NL = ee.Geometry.Polygon(
    [
        [
            [-99.85, 27.78],
            [-100.15, 27.65],
            [-101.05, 26.55],
            [-101.2, 25.85],
            [-101.05, 24.95],
            [-100.55, 24.15],
            [-100.25, 23.35],
            [-99.85, 23.18],
            [-99.15, 23.55],
            [-98.55, 24.25],
            [-98.42, 25.15],
            [-98.55, 25.95],
            [-98.95, 26.65],
            [-99.35, 27.35],
            [-99.85, 27.78],
        ]
    ]
)

COLLECTIONS = {
    "NO2": ("COPERNICUS/S5P/OFFL/L3_NO2", "tropospheric_NO2_column_number_density"),
    "SO2": ("COPERNICUS/S5P/OFFL/L3_SO2", "SO2_column_number_density"),
    "CO": ("COPERNICUS/S5P/OFFL/L3_CO", "CO_column_number_density"),
}

REGIONS = {
    "estatal": NL,
    "amm": ee.Geometry.Point([-100.316, 25.686]).buffer(28000),
    "industrial_este": ee.Geometry.Point([-99.99, 25.59]).buffer(18000),
    "occidente": ee.Geometry.Point([-100.52, 25.73]).buffer(18000),
    "norte": ee.Geometry.Point([-100.18, 26.5]).buffer(22000),
    "sur": ee.Geometry.Point([-99.85, 24.85]).buffer(22000),
}


def month_starts(start: dt.date, end: dt.date) -> list[dt.date]:
    cur = dt.date(start.year, start.month, 1)
    out: list[dt.date] = []
    while cur <= end:
        out.append(cur)
        if cur.month == 12:
            cur = dt.date(cur.year + 1, 1, 1)
        else:
            cur = dt.date(cur.year, cur.month + 1, 1)
    return out


def monthly_mean(coll_id: str, band: str, geom: ee.Geometry, start: str, end: str) -> float | None:
    img = (
        ee.ImageCollection(coll_id)
        .select(band)
        .filterDate(start, end)
        .filterBounds(geom)
        .mean()
    )
    stats = img.reduceRegion(reducer=ee.Reducer.mean(), geometry=geom, scale=5000, maxPixels=1e8)
    value = stats.get(band).getInfo()
    return float(value) if value is not None else None


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
CSV_PATH = DATA_DIR / "s5p_nl_monthly.csv"
STATUS_PATH = DATA_DIR / "status.json"
FIELDS = ["month", "pollutant", "region", "mol_m2", "collection", "band"]
FIRST_MONTH = dt.date(2019, 1, 1)
# Una hora: el paso más fino útil hoy (SIMA publica IMECA horario; S5P NRTI tarda ~3 h).
VERIFY_EVERY_S = 60 * 60
# OFFL llega con días de retraso: cada verificación revisa los últimos meses.
RECENT_MONTHS = 2


def next_month(d: dt.date) -> dt.date:
    return dt.date(d.year + 1, 1, 1) if d.month == 12 else dt.date(d.year, d.month + 1, 1)


def extract(months: list[dt.date]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for pollutant, (coll_id, band) in COLLECTIONS.items():
        for region, geom in REGIONS.items():
            for stamp in months:
                value = monthly_mean(coll_id, band, geom, stamp.isoformat(), next_month(stamp).isoformat())
                rows.append(
                    {
                        "month": stamp.strftime("%Y-%m"),
                        "pollutant": pollutant,
                        "region": region,
                        "mol_m2": value,
                        "collection": coll_id,
                        "band": band,
                    }
                )
                print(stamp, pollutant, region, value)
    return rows


def read_csv() -> dict[tuple[str, str, str], dict[str, object]]:
    if not CSV_PATH.exists():
        return {}
    with CSV_PATH.open(newline="", encoding="utf-8") as fh:
        return {(r["month"], r["pollutant"], r["region"]): r for r in csv.DictReader(fh)}


def write_outputs(rows: dict[tuple[str, str, str], dict[str, object]], changed: bool) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    if changed or not CSV_PATH.exists():
        with CSV_PATH.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows[k] for k in sorted(rows))
    previous = json.loads(STATUS_PATH.read_text(encoding="utf-8")) if STATUS_PATH.exists() else {}
    filled = [k[0] for k, r in rows.items() if r.get("mol_m2") not in (None, "")]
    status = {
        "checked_at": now,
        "updated_at": now if changed else previous.get("updated_at", now),
        "latest_month": max(filled) if filled else None,
        "source": "COPERNICUS/S5P/OFFL/L3 · Google Earth Engine",
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")
    print("status", status)


def verify_once(full: bool) -> None:
    today = dt.date.today()
    current = dt.date(today.year, today.month, 1)
    rows = read_csv()
    if full or not rows:
        months = month_starts(FIRST_MONTH, current)
    else:
        start = current
        for _ in range(RECENT_MONTHS - 1):
            start = dt.date(start.year - 1, 12, 1) if start.month == 1 else dt.date(start.year, start.month - 1, 1)
        months = month_starts(start, current)
    changed = False
    for row in extract(months):
        key = (str(row["month"]), str(row["pollutant"]), str(row["region"]))
        old = rows.get(key)
        new_val = "" if row["mol_m2"] is None else str(row["mol_m2"])
        if old is None or str(old.get("mol_m2") or "") != new_val:
            changed = True
        rows[key] = {**row, "mol_m2": new_val}
    write_outputs(rows, changed)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hourly", action="store_true", help="verifica cada hora los meses recientes")
    args = parser.parse_args()
    ee.Initialize()
    verify_once(full=not args.hourly)
    while args.hourly:
        time.sleep(VERIFY_EVERY_S)
        try:
            verify_once(full=False)
        except Exception as exc:  # noqa: BLE001 — una caída de red no debe matar el ciclo
            print("verificación fallida, se reintenta en una hora:", exc)


if __name__ == "__main__":
    main()
