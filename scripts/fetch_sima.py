"""
Descarga el Índice AIRE y SALUD por estación del visor oficial SIMA (Nuevo León).

SIMA no ofrece API ni CORS: el visor incrusta las lecturas horarias en su HTML
(`const arrayIMKTodo = [...]`). Este script las extrae y publica:

  public/data/sima_now.json      lectura más reciente (la app la usa para colorear)
  public/data/sima_history.json  últimas 2 semanas, para cruzar con los aforos por hora

Uso (solo librería estándar):
  python scripts/fetch_sima.py            # una lectura
  python scripts/fetch_sima.py --hourly   # cada hora, el mismo ritmo con que SIMA publica
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path

SIMA_URL = "https://aire.nl.gob.mx/airemapbing/airebing_ns_copy.php"
DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
NOW_PATH = DATA_DIR / "sima_now.json"
HISTORY_PATH = DATA_DIR / "sima_history.json"
KEEP_SNAPSHOTS = 24 * 14
EVERY_S = 60 * 60
PATTERN = re.compile(r"const\s+arrayIMKTodo\s*=\s*(\[.*?\]);", re.S)


def fetch_snapshot() -> dict:
    req = urllib.request.Request(SIMA_URL, headers={"User-Agent": "EcoMotion/1.0 (+monitoreo de calidad del aire)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    match = PATTERN.search(html)
    if not match:
        raise RuntimeError("SIMA cambió el formato: no se encontró arrayIMKTodo")
    readings = [
        {
            "station": r["Estacion"].lower(),
            "pollutant": r["Parameter"],
            "index": float(r["HrAveData"]),
            "concentration": float(r["Concentracion"]) if r.get("Concentracion") is not None else None,
            "date": r["Date"],
        }
        for r in json.loads(match.group(1))
    ]
    if not readings:
        raise RuntimeError("SIMA respondió sin lecturas")
    return {"date": max(r["date"] for r in readings), "readings": readings}


def publish(snapshot: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    NOW_PATH.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    history = []
    if HISTORY_PATH.exists():
        history = json.loads(HISTORY_PATH.read_text(encoding="utf-8")).get("snapshots", [])
    by_date = {s["date"]: s for s in history}
    by_date[snapshot["date"]] = snapshot
    kept = [by_date[d] for d in sorted(by_date)][-KEEP_SNAPSHOTS:]
    HISTORY_PATH.write_text(json.dumps({"snapshots": kept}, ensure_ascii=False), encoding="utf-8")
    worst = max(snapshot["readings"], key=lambda r: r["index"])
    print(f"SIMA {snapshot['date']} · {len(snapshot['readings'])} estaciones · peor {worst['station']} {worst['index']:.0f}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hourly", action="store_true", help="consulta SIMA cada hora")
    args = parser.parse_args()
    while True:
        try:
            publish(fetch_snapshot())
        except Exception as exc:  # noqa: BLE001 — un fallo de red no debe detener el ciclo
            if not args.hourly:
                raise
            print("SIMA no respondió, se reintenta en una hora:", exc)
        if not args.hourly:
            break
        time.sleep(EVERY_S)


if __name__ == "__main__":
    main()
