import { GUIDELINES, type Pollutant } from "../data/catalog"

export type HealthScore = {
  pollutant: Pollutant
  annualMean: number
  omsRatio: number | null
  nomRatio: number | null
  daysOverOms24hPct: number | null
  band: "protege" | "riesgo" | "incumple_salud" | "incumple_nom"
  headline: string
  detail: string
}

function bandFor(pollutant: Pollutant, annual: number, over24: number | null): HealthScore["band"] {
  const g = GUIDELINES[pollutant]
  if (g.nomAnnual && annual > g.nomAnnual) return "incumple_nom"
  if (g.omsAnnual && annual > g.omsAnnual) return "incumple_salud"
  if (over24 && over24 > 8) return "incumple_salud"
  if (over24 && over24 > 2) return "riesgo"
  if (pollutant === "NO2" && annual > 8) return "riesgo"
  return "protege"
}

export function assessHealth(
  pollutant: Pollutant,
  monthlySurface: { t: string; y: number }[],
  p95Surface: { t: string; y: number }[],
): HealthScore {
  const g = GUIDELINES[pollutant]
  const annualMean = monthlySurface.reduce((a, p) => a + p.y, 0) / monthlySurface.length
  const omsRatio = g.omsAnnual ? annualMean / g.omsAnnual : null
  const nomRatio = g.nomAnnual ? annualMean / g.nomAnnual : null
  let daysOverOms24hPct: number | null = null
  if (g.oms24h) {
    const over = p95Surface.filter((p) => p.y > g.oms24h!).length
    daysOverOms24hPct = (over / p95Surface.length) * 100
  }
  const band = bandFor(pollutant, annualMean, daysOverOms24hPct)
  const headlines: Record<HealthScore["band"], string> = {
    protege: "Niveles compatibles con protección a la salud (OMS).",
    riesgo: "Hay episodios o un fondo que ya implica riesgo sanitario.",
    incumple_salud: "Se rebasa la guía OMS: la gestión no está protegiendo la salud.",
    incumple_nom: "Se rebasa la NOM mexicana y la guía OMS.",
  }
  return {
    pollutant,
    annualMean,
    omsRatio,
    nomRatio,
    daysOverOms24hPct,
    band,
    headline: headlines[band],
    detail: g.health,
  }
}

/** Riesgo relativo aproximado por 10 µg/m³ de NO₂ por encima de 10 µg/m³ (largo plazo). */
export function no2RelativeRisk(annualUg: number): number {
  const delta = Math.max(0, annualUg - 10) / 10
  return 1 + 0.02 * delta
}
