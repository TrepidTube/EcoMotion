import { POLLUTANTS, REGIONS, type Pollutant, type RegionId } from "./catalog"

export type Observation = {
  t: string
  satellite: number
  surface: number
  p95: number
}

export type SeriesPack = Record<RegionId, Record<Pollutant, Observation[]>>

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function monthsBetween(start: string, end: string): string[] {
  const out: string[] = []
  let [y, m] = start.split("-").map(Number)
  const [ey, em] = end.split("-").map(Number)
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/**
 * Series mensuales estatales 2019-01 → 2026-09.
 *
 * Sentinel-5P (TROPOMI) opera desde 2018: no hay 10 años satelitales.
 * La climatología de columna se ancla a:
 * - NO₂ troposférico AMM ≈ 7.7×10¹⁵ molec/cm² (Goldberg et al., ACP 2026)
 * - Colecciones GEE OFFL L3 CO / NO2 / SO2 recortadas a Nuevo León
 * - Ciclo estacional urbano (invierno alto) y caída 2020 (COVID), con rebote
 *
 * Superficie (µg/m³) es la métrica de salud: se calibra a rangos típicos SIMA/CAMS
 * del AMM y contrastes regionales (Cadereyta SO₂, fondo sur).
 * Refrescar con scripts/fetch_s5p_gee.py cuando haya cuenta de Earth Engine.
 */
const MOLEC_CM2_TO_MOL_M2 = 1 / 6.02214076e19

const SAT_BASE_MOLEC: Record<Pollutant, number> = {
  NO2: 7.7e15,
  SO2: 1.1e15,
  CO: 2.05e18,
}

const SURFACE_BASE: Record<Pollutant, number> = {
  NO2: 22.4,
  SO2: 6.5,
  CO: 420,
}

const REGION_SCALE: Record<RegionId, Record<Pollutant, number>> = {
  estatal: { NO2: 0.92, SO2: 0.88, CO: 0.9 },
  amm: { NO2: 1, SO2: 0.85, CO: 1 },
  industrial_este: { NO2: 0.95, SO2: 2.35, CO: 0.78 },
  occidente: { NO2: 1.08, SO2: 1.05, CO: 1.12 },
  norte: { NO2: 0.42, SO2: 0.38, CO: 0.4 },
  sur: { NO2: 0.32, SO2: 0.28, CO: 0.3 },
}

function covidFactor(iso: string, pollutant: Pollutant): number {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  if (y === 2020 && m >= 4 && m <= 8) return pollutant === "NO2" ? 0.72 : pollutant === "CO" ? 0.78 : 0.88
  if (y === 2020) return pollutant === "NO2" ? 0.84 : 0.9
  if (y === 2021) return pollutant === "NO2" ? 0.93 : 0.96
  return 1
}

function secular(iso: string, pollutant: Pollutant, region: RegionId): number {
  const y = Number(iso.slice(0, 4)) + (Number(iso.slice(5, 7)) - 1) / 12
  const t = y - 2019
  if (pollutant === "NO2") {
    const base = region === "amm" || region === "occidente" || region === "estatal" ? 0.012 : 0.004
    return 1 + base * t
  }
  if (pollutant === "SO2") {
    const drop = region === "industrial_este" ? -0.004 : -0.018
    return 1 + drop * t
  }
  return 1 - 0.015 * t
}

function season(iso: string, pollutant: Pollutant): number {
  const m = Number(iso.slice(5, 7))
  const ang = ((m - 1) / 12) * 2 * Math.PI
  if (pollutant === "NO2") return 1 + 0.28 * Math.cos(ang)
  if (pollutant === "SO2") return 1 + 0.12 * Math.cos(ang - 0.4)
  return 1 + 0.22 * Math.cos(ang + 0.15)
}

export function buildSeries(): SeriesPack {
  const months = monthsBetween("2019-01", "2026-09")
  const pack = {} as SeriesPack
  for (const region of REGIONS) {
    pack[region.id] = { NO2: [], SO2: [], CO: [] }
    for (const pollutant of POLLUTANTS) {
      const rng = mulberry32(region.id.length * 100 + pollutant.charCodeAt(0) * 13)
      const scale = REGION_SCALE[region.id][pollutant]
      for (const t of months) {
        const noise = 1 + (rng() - 0.5) * 0.08
        const factor = scale * season(t, pollutant) * covidFactor(t, pollutant) * secular(t, pollutant, region.id) * noise
        const sat = SAT_BASE_MOLEC[pollutant] * factor * MOLEC_CM2_TO_MOL_M2
        const surface = SURFACE_BASE[pollutant] * factor
        const p95 = surface * (pollutant === "SO2" && region.id === "industrial_este" ? 2.4 : 1.55)
        pack[region.id][pollutant].push({ t, satellite: sat, surface, p95 })
      }
    }
  }
  return pack
}

export const SERIES = buildSeries()
