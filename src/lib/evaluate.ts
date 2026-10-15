import type { Pollutant } from "../data/catalog"
import type { HealthScore } from "./health"

type Mk = {
  p: number
  trend: "alza" | "baja" | "estable"
  senPerYear: number
}
type Ols = {
  pctChange: number
  r2: number
}

export type Verdict = {
  grade: "adecuada" | "parcial" | "insuficiente"
  title: string
  summary: string
  bullets: string[]
}

export function evaluateManagement(input: {
  pollutant: Pollutant
  regionName: string
  windowLabel: string
  ols: Ols
  mk: Mk
  health: HealthScore
  satelliteAgrees: boolean
}): Verdict {
  const { pollutant, regionName, windowLabel, ols, mk, health, satelliteAgrees } = input
  const falling = mk.trend === "baja" && mk.p < 0.05
  const rising = mk.trend === "alza" && mk.p < 0.05
  const healthFail = health.band === "incumple_salud" || health.band === "incumple_nom"

  let grade: Verdict["grade"] = "parcial"
  if (healthFail && (rising || mk.trend === "estable")) grade = "insuficiente"
  else if (!healthFail && falling) grade = "adecuada"
  else if (healthFail && falling) grade = "parcial"
  else if (!healthFail && rising) grade = "parcial"
  else grade = healthFail ? "insuficiente" : "parcial"

  const titles = {
    adecuada: `Gestión en rumbo correcto · ${pollutant} · ${regionName}`,
    parcial: `Avance incompleto para el sector salud · ${pollutant} · ${regionName}`,
    insuficiente: `Gestión insuficiente para proteger la salud · ${pollutant} · ${regionName}`,
  }

  const slopeTxt = Number.isFinite(ols.pctChange)
    ? `${ols.pctChange >= 0 ? "+" : ""}${ols.pctChange.toFixed(1)}% en ${windowLabel} (OLS)`
    : "sin pendiente"

  const mkTxt = `Mann–Kendall: tendencia ${mk.trend} (p=${mk.p.toFixed(3)})`

  const bullets = [
    `Cambio acumulado: ${slopeTxt}. R² = ${ols.r2.toFixed(2)}.`,
    mkTxt + `. Pendiente de Sen: ${mk.senPerYear >= 0 ? "+" : ""}${mk.senPerYear.toFixed(3)} unidades/año.`,
    health.headline,
    satelliteAgrees
      ? "El patrón satelital (Sentinel-5P) y el de superficie van en el mismo sentido: la señal no es un artefacto de una sola red."
      : "Hay divergencia entre columna satelital y superficie: conviene revisar cobertura SIMA y meteorología, no solo el promedio estatal.",
  ]

  const summary =
    grade === "insuficiente"
      ? `En ${regionName}, ${pollutant} no muestra una reducción estadísticamente sostenida mientras la exposición sigue por encima de lo que el sector salud considera seguro (OMS). Cumplir la NOM no basta si la guía sanitaria se rebasa.`
      : grade === "adecuada"
        ? `En ${regionName}, ${pollutant} baja de forma significativa y los niveles se acercan a protección sanitaria. Hay que sostener la tendencia, no declarar el problema cerrado.`
        : `En ${regionName}, ${pollutant} no está resuelto para salud: o baja demasiado lento, o el promedio oculta picos y desigualdad espacial (AMM vs. corredor industrial).`

  return { grade, title: titles[grade], summary, bullets }
}
