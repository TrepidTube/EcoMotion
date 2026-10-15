import { POLLUTANTS, REGIONS, type Pollutant, type RegionId } from "./catalog"
import type { Observation, SeriesPack } from "./buildSeries"

/** Archivos que publica `scripts/fetch_s5p_gee.py` dentro de public/data/. */
export const STATUS_URL = "/data/status.json"
export const CSV_URL = "/data/s5p_nl_monthly.csv"

export type FeedStatus = {
  /** Última vez que el extractor consultó Earth Engine (ISO). */
  checked_at: string
  /** Última vez que cambió algún valor del CSV (ISO). */
  updated_at: string
  /** Último mes con columna disponible, p. ej. "2026-09". */
  latest_month: string
  source: string
}

type CsvRow = { month: string; pollutant: Pollutant; region: RegionId; molM2: number }

export function parseS5pCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  const header = lines.shift()?.split(",") ?? []
  const idx = (name: string) => header.indexOf(name)
  const [iMonth, iPol, iReg, iVal] = [idx("month"), idx("pollutant"), idx("region"), idx("mol_m2")]
  const rows: CsvRow[] = []
  for (const line of lines) {
    const cols = line.split(",")
    const molM2 = Number(cols[iVal])
    if (!cols[iVal] || !Number.isFinite(molM2)) continue
    rows.push({ month: cols[iMonth], pollutant: cols[iPol] as Pollutant, region: cols[iReg] as RegionId, molM2 })
  }
  return rows
}

/**
 * Sustituye la columna Sentinel-5P de la serie por los valores reales del CSV.
 * Los meses nuevos (posteriores a la serie) se agregan con la superficie estimada
 * por la razón superficie/columna de los últimos 12 meses de esa región, hasta
 * que exista el dato terrestre SIMA/INECC correspondiente.
 */
export function mergeS5p(base: SeriesPack, rows: CsvRow[]): SeriesPack {
  const out = {} as SeriesPack
  for (const r of REGIONS) {
    out[r.id] = { NO2: [], SO2: [], CO: [] }
    for (const p of POLLUTANTS) {
      const obs = base[r.id][p].map((o) => ({ ...o }))
      const byMonth = new Map(obs.map((o) => [o.t, o]))
      const fresh = rows
        .filter((row) => row.region === r.id && row.pollutant === p)
        .sort((a, b) => a.month.localeCompare(b.month))
      for (const row of fresh) {
        const hit = byMonth.get(row.month)
        if (hit) {
          hit.satellite = row.molM2
          continue
        }
        if (obs.length && row.month < obs[0].t) continue
        const recent = obs.slice(-12)
        const ratio = recent.reduce((a, o) => a + o.surface / o.satellite, 0) / recent.length
        const p95Ratio = recent.reduce((a, o) => a + o.p95 / o.surface, 0) / recent.length
        const surface = row.molM2 * ratio
        const added: Observation = { t: row.month, satellite: row.molM2, surface, p95: surface * p95Ratio }
        obs.push(added)
        byMonth.set(row.month, added)
      }
      out[r.id][p] = obs
    }
  }
  return out
}

export function yearSpan(series: SeriesPack): { first: number; last: number } {
  const ref = series.amm.NO2
  return { first: Number(ref[0].t.slice(0, 4)), last: Number(ref[ref.length - 1].t.slice(0, 4)) }
}

export function latestMonth(series: SeriesPack): string {
  const ref = series.amm.NO2
  return ref[ref.length - 1].t
}
