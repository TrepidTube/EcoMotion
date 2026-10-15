import { useCallback, useState } from "react"
import { fetchAforos, type AforoFeed } from "../data/aforos"
import { fetchSimaHistory, fetchSimaNow, type SimaSnapshot } from "../data/sima"
import { useEveryHour } from "./useHourlyVerification"

export type LiveFeeds = {
  sima: SimaSnapshot | null
  simaVia: "feed" | "proxy" | null
  /** Historial horario SIMA (feed del script) + lecturas vistas en esta sesión. */
  history: SimaSnapshot[]
  aforos: AforoFeed | null
  lastCheck: Date | null
  loading: boolean
}

function mergeHistory(prev: SimaSnapshot[], incoming: SimaSnapshot[]): SimaSnapshot[] {
  const byDate = new Map(prev.map((s) => [s.date, s]))
  for (const s of incoming) {
    // Misma hora: la lectura nueva gana estación por estación, sin perder las demás.
    const old = byDate.get(s.date)
    if (!old) {
      byDate.set(s.date, s)
      continue
    }
    const readings = new Map(old.readings.map((r) => [r.station, r]))
    for (const r of s.readings) readings.set(r.station, r)
    byDate.set(s.date, { date: s.date, readings: [...readings.values()] })
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-24 * 14)
}

/** SIMA (índice horario por estación) y el feed de aforos, verificados cada hora. */
export function useLiveFeeds() {
  const [state, setState] = useState<LiveFeeds>({
    sima: null,
    simaVia: null,
    history: [],
    aforos: null,
    lastCheck: null,
    loading: true,
  })

  const refresh = useCallback(async () => {
    const [now, history, aforos] = await Promise.all([
      fetchSimaNow().catch(() => null),
      fetchSimaHistory().catch(() => []),
      fetchAforos().catch(() => null),
    ])
    setState((s) => ({
      sima: now?.snapshot ?? s.sima,
      simaVia: now?.via ?? (s.sima ? s.simaVia : null),
      history: mergeHistory(s.history, now ? [...history, now.snapshot] : history),
      aforos,
      lastCheck: new Date(),
      loading: false,
    }))
  }, [])

  useEveryHour(refresh)

  const refreshNow = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    return refresh()
  }, [refresh])

  return { ...state, refreshNow }
}
