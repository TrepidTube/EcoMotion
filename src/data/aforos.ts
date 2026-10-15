import { SIMA_STATIONS } from "./catalog"
import type { SimaSnapshot } from "./sima"

/**
 * Feed de conteo de personas (sensores / cámaras / torniquetes) que publica el
 * operador. Ruta configurable con VITE_AFOROS_URL; por defecto public/data/aforos.json.
 *
 * {
 *   "updated_at": "2026-10-14T19:05:00-06:00",
 *   "sensors": [{ "id": "mty-macroplaza-01", "name": "Macroplaza norte", "station": "centro",
 *                 "lat": 25.6714, "lng": -100.3096 }],
 *   "counts":  [{ "sensor": "mty-macroplaza-01", "hour": "2026-10-14 19:00", "people": 1840 }]
 * }
 *
 * `hour` usa el mismo formato que SIMA ("YYYY-MM-DD HH:00", hora local) para cruzar
 * cada conteo con el índice AIRE y SALUD de esa hora. `station` es opcional: si falta
 * se asigna la estación SIMA más cercana a `lat`/`lng`.
 */
export const AFOROS_URL: string = import.meta.env.VITE_AFOROS_URL || "/data/aforos.json"

export type AforoSensor = { id: string; name: string; station?: string; lat?: number; lng?: number }
export type AforoCount = { sensor: string; hour: string; people: number }
export type AforoFeed = { updated_at: string; sensors: AforoSensor[]; counts: AforoCount[] }

export async function fetchAforos(): Promise<AforoFeed | null> {
  const url = `${AFOROS_URL}${AFOROS_URL.includes("?") ? "&" : "?"}t=${Date.now()}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null
  const feed = (await res.json()) as AforoFeed
  return Array.isArray(feed.sensors) && Array.isArray(feed.counts) ? feed : null
}

function nearestStation(lat: number, lng: number): string {
  let best = SIMA_STATIONS[0]
  let bestD = Infinity
  for (const s of SIMA_STATIONS) {
    const d = (s.lat - lat) ** 2 + ((s.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best.id
}

export function sensorStation(sensor: AforoSensor): string | null {
  if (sensor.station) return sensor.station.toLowerCase()
  if (sensor.lat != null && sensor.lng != null) return nearestStation(sensor.lat, sensor.lng)
  return null
}

export type HourCell = { hour: number; counted: number; exposed: number; worstIndex: number | null }
export type StationExposure = { station: string; counted: number; exposed: number; worstIndex: number | null; sensors: number }

export type ExposureSummary = {
  day: string
  days: string[]
  counted: number
  exposed: number
  /** Personas contadas en horas sin índice SIMA (estación en mantenimiento o sin historial). */
  unknown: number
  byHour: HourCell[]
  byStation: StationExposure[]
}

/**
 * Cruza cada conteo horario con el índice SIMA de su estación a esa misma hora.
 * Una persona contada en una hora con índice >= `threshold` cuenta como expuesta.
 * Los sensores cuentan pasos: una misma persona puede sumar en varias horas o puntos.
 */
export function computeExposure(
  feed: AforoFeed,
  snapshots: SimaSnapshot[],
  threshold: number,
  day?: string,
): ExposureSummary | null {
  const days = [...new Set(feed.counts.map((c) => c.hour.slice(0, 10)))].sort()
  if (!days.length) return null
  const target = day && days.includes(day) ? day : days[days.length - 1]

  const indexAt = new Map<string, Map<string, number>>()
  for (const snap of snapshots) {
    const m = indexAt.get(snap.date) ?? new Map<string, number>()
    for (const r of snap.readings) m.set(r.station, r.index)
    indexAt.set(snap.date, m)
  }
  const stationOf = new Map(feed.sensors.map((s) => [s.id, sensorStation(s)]))

  const byHour: HourCell[] = Array.from({ length: 24 }, (_, hour) => ({ hour, counted: 0, exposed: 0, worstIndex: null }))
  const byStation = new Map<string, StationExposure>()
  const sensorsPerStation = new Map<string, Set<string>>()
  let counted = 0
  let exposed = 0
  let unknown = 0

  for (const c of feed.counts) {
    if (!c.hour.startsWith(target) || !(c.people > 0)) continue
    const station = stationOf.get(c.sensor) ?? null
    const idx = station ? indexAt.get(c.hour)?.get(station) : undefined
    const hourCell = byHour[Number(c.hour.slice(11, 13))]
    counted += c.people
    hourCell.counted += c.people
    if (idx == null || idx < 0) unknown += c.people
    else {
      hourCell.worstIndex = Math.max(hourCell.worstIndex ?? -1, idx)
      if (idx >= threshold) {
        exposed += c.people
        hourCell.exposed += c.people
      }
    }
    if (!station) continue
    const st = byStation.get(station) ?? { station, counted: 0, exposed: 0, worstIndex: null, sensors: 0 }
    st.counted += c.people
    if (idx != null && idx >= 0) {
      st.worstIndex = Math.max(st.worstIndex ?? -1, idx)
      if (idx >= threshold) st.exposed += c.people
    }
    byStation.set(station, st)
    const set = sensorsPerStation.get(station) ?? new Set<string>()
    set.add(c.sensor)
    sensorsPerStation.set(station, set)
  }

  const stations = [...byStation.values()]
    .map((s) => ({ ...s, sensors: sensorsPerStation.get(s.station)?.size ?? 0 }))
    .sort((a, b) => b.exposed - a.exposed || b.counted - a.counted)
  return { day: target, days, counted, exposed, unknown, byHour, byStation: stations }
}
