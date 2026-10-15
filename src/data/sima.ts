import { SIMA_STATIONS, type RegionId } from "./catalog"

/** Feed generado por `scripts/fetch_sima.py` (producción / hosting estático). */
export const SIMA_NOW_URL = "/data/sima_now.json"
export const SIMA_HISTORY_URL = "/data/sima_history.json"
/** Proxy de Vite hacia aire.nl.gob.mx (solo `npm run dev` / `npm run preview`). */
export const SIMA_PROXY_URL = "/sima-live/airemapbing/airebing_ns_copy.php"

export type AqLevel = "none" | "good" | "ok" | "bad" | "verybad" | "extreme"

/** Índice AIRE y SALUD con los mismos cortes que usa el visor SIMA. */
export const AQ_LEVELS: Record<AqLevel, { label: string; risk: string; min: number }> = {
  none: { label: "Sin dato / Mtto.", risk: "—", min: -Infinity },
  good: { label: "Buena", risk: "Bajo", min: 0 },
  ok: { label: "Aceptable", risk: "Moderado", min: 51 },
  bad: { label: "Mala", risk: "Alto", min: 101 },
  verybad: { label: "Muy mala", risk: "Muy alto", min: 151 },
  extreme: { label: "Extremadamente mala", risk: "Extremo", min: 201 },
}

export const AQ_ORDER: AqLevel[] = ["good", "ok", "bad", "verybad", "extreme"]

export function aqLevel(index: number | null | undefined): AqLevel {
  if (index == null || !Number.isFinite(index) || index < 0) return "none"
  if (index > 200) return "extreme"
  if (index > 150) return "verybad"
  if (index > 100) return "bad"
  if (index > 50) return "ok"
  return "good"
}

export type SimaReading = {
  station: string
  pollutant: string
  index: number
  concentration: number | null
  date: string
}

export type SimaSnapshot = {
  /** Hora SIMA, formato "YYYY-MM-DD HH:00". */
  date: string
  readings: SimaReading[]
}

const UNITS: Record<string, string> = { PM10: "µg/m³", PM25: "µg/m³", O3: "ppb", NO2: "ppb", SO2: "ppb", CO: "ppm" }
const POLLUTANT_LABEL: Record<string, string> = { PM10: "PM₁₀", PM25: "PM₂.₅", O3: "O₃", NO2: "NO₂", SO2: "SO₂", CO: "CO" }

export function pollutantLabel(code: string) {
  return POLLUTANT_LABEL[code] ?? code
}

export function pollutantUnit(code: string) {
  return UNITS[code] ?? ""
}

type RawImk = { Estacion: string; Parameter: string; HrAveData: number; Concentracion: number; Date: string }

/** Extrae el arreglo `arrayIMKTodo` que el visor SIMA incrusta en su HTML. */
export function parseSimaHtml(html: string): SimaSnapshot | null {
  const m = html.match(/const\s+arrayIMKTodo\s*=\s*(\[[\s\S]*?\]);/)
  if (!m) return null
  const raw = JSON.parse(m[1]) as RawImk[]
  const readings = raw.map((r) => ({
    station: r.Estacion.toLowerCase(),
    pollutant: r.Parameter,
    index: Number(r.HrAveData),
    concentration: Number.isFinite(Number(r.Concentracion)) ? Number(r.Concentracion) : null,
    date: r.Date,
  }))
  if (!readings.length) return null
  const date = readings.map((r) => r.date).sort().at(-1)!
  return { date, readings }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" })
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null
  return (await res.json()) as T
}

async function fetchViaProxy(): Promise<SimaSnapshot | null> {
  const res = await fetch(SIMA_PROXY_URL, { cache: "no-store" })
  return res.ok ? parseSimaHtml(await res.text()) : null
}

/** Consulta el feed publicado y el proxy de desarrollo; usa la lectura más reciente. */
export async function fetchSimaNow(): Promise<{ snapshot: SimaSnapshot; via: "feed" | "proxy" } | null> {
  const [feed, proxied] = await Promise.all([
    fetchJson<SimaSnapshot>(SIMA_NOW_URL).catch(() => null),
    fetchViaProxy().catch(() => null),
  ])
  const options = [
    feed?.readings?.length ? { snapshot: feed, via: "feed" as const } : null,
    proxied ? { snapshot: proxied, via: "proxy" as const } : null,
  ].filter((o) => o !== null)
  return options.sort((a, b) => b.snapshot.date.localeCompare(a.snapshot.date))[0] ?? null
}

export async function fetchSimaHistory(): Promise<SimaSnapshot[]> {
  const data = await fetchJson<{ snapshots: SimaSnapshot[] }>(SIMA_HISTORY_URL).catch(() => null)
  return data?.snapshots ?? []
}

export function readingByStation(snapshot: SimaSnapshot | null): Map<string, SimaReading> {
  return new Map((snapshot?.readings ?? []).map((r) => [r.station, r]))
}

/**
 * Estado de una región: el peor índice entre sus estaciones (criterio precautorio,
 * el mismo que aplica SIMA al activar contingencias por zona).
 */
export function regionStatus(regionId: RegionId, byStation: Map<string, SimaReading>) {
  const stations = SIMA_STATIONS.filter((s) => regionId === "estatal" || s.region === regionId)
  const readings = stations.map((s) => byStation.get(s.id)).filter((r): r is SimaReading => !!r)
  if (!stations.length) return { level: "none" as AqLevel, worst: null, stations: 0, reporting: 0 }
  const worst = readings.reduce<SimaReading | null>((a, r) => (!a || r.index > a.index ? r : a), null)
  return { level: aqLevel(worst?.index), worst, stations: stations.length, reporting: readings.length }
}
