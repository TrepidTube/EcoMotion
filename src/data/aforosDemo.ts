import type { AforoFeed } from "./aforos"
import type { SimaSnapshot } from "./sima"

/**
 * Datos SIMULADOS solo para previsualizar el módulo de exposición mientras no
 * exista un feed real de sensores. La UI los marca siempre como ejemplo.
 */
const SENSORS = [
  { id: "demo-macroplaza", name: "Macroplaza (ejemplo)", station: "centro", base: 950 },
  { id: "demo-guadalupe", name: "Av. Pablo Livas (ejemplo)", station: "sureste", base: 620 },
  { id: "demo-cadereyta", name: "Centro Cadereyta (ejemplo)", station: "sureste3", base: 280 },
  { id: "demo-garcia", name: "Parque industrial García (ejemplo)", station: "noroeste2", base: 410 },
]

// Afluencia relativa por hora: picos de entrada (7–9 h) y salida (17–19 h).
const FLOW = [0.08, 0.05, 0.04, 0.04, 0.07, 0.2, 0.55, 1, 0.95, 0.7, 0.62, 0.66, 0.78, 0.8, 0.7, 0.68, 0.75, 0.98, 1, 0.82, 0.55, 0.36, 0.22, 0.13]

// Índice SIMA relativo por hora: PM de madrugada/tarde y pico de ozono al mediodía.
const AIR = [62, 58, 55, 52, 54, 64, 82, 96, 104, 112, 124, 138, 150, 158, 162, 154, 140, 126, 116, 104, 92, 80, 72, 66]
const STATION_SHIFT: Record<string, number> = { centro: 0, sureste: -14, sureste3: 22, noroeste2: 8 }

export function buildDemo(): { day: string; feed: AforoFeed; history: SimaSnapshot[] } {
  const now = new Date()
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const hour = (h: number) => `${day} ${String(h).padStart(2, "0")}:00`

  const counts = SENSORS.flatMap((s, i) =>
    FLOW.map((f, h) => ({ sensor: s.id, hour: hour(h), people: Math.round(s.base * f * (1 + ((i * 7 + h * 3) % 9) / 40)) })),
  )
  const history = AIR.map((v, h) => ({
    date: hour(h),
    readings: SENSORS.map((s) => ({
      station: s.station,
      pollutant: h >= 10 && h <= 17 ? "O3" : "PM25",
      index: Math.max(0, v + STATION_SHIFT[s.station]),
      concentration: null,
      date: hour(h),
    })),
  }))
  return {
    day,
    feed: {
      updated_at: now.toISOString(),
      sensors: SENSORS.map(({ id, name, station }) => ({ id, name, station })),
      counts,
    },
    history,
  }
}
