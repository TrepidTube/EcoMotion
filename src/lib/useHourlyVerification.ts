import { useCallback, useEffect, useRef, useState } from "react"
import type { SeriesPack } from "../data/buildSeries"
import { CSV_URL, STATUS_URL, mergeS5p, parseS5pCsv, type FeedStatus } from "../data/liveData"

/** Una hora: el paso más fino que hoy ofrecen SIMA (IMECA horario) y la latencia NRTI de Sentinel-5P. */
export const VERIFY_EVERY_MS = 60 * 60 * 1000

export type VerificationState = {
  phase: "checking" | "fresh" | "unchanged" | "bundled" | "offline"
  lastCheck: Date | null
  nextCheck: Date | null
  feed: FeedStatus | null
}

/**
 * Ejecuta `run` al montar y luego cada hora. También al volver a la pestaña si ya
 * pasó la hora (los navegadores congelan timers en segundo plano).
 */
export function useEveryHour(run: () => unknown) {
  const lastRun = useRef(0)
  useEffect(() => {
    const tick = () => {
      lastRun.current = Date.now()
      void run()
    }
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, VERIFY_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRun.current >= VERIFY_EVERY_MS) tick()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [run])
}

async function fetchStatus(): Promise<FeedStatus | null> {
  const res = await fetch(`${STATUS_URL}?t=${Date.now()}`, { cache: "no-store" })
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null
  return (await res.json()) as FeedStatus
}

/**
 * Verifica cada hora si el extractor publicó columnas nuevas. Si `updated_at`
 * cambió, descarga el CSV y lo fusiona con la serie base.
 */
export function useHourlyVerification(base: SeriesPack, onSeries: (s: SeriesPack) => void) {
  const [state, setState] = useState<VerificationState>({
    phase: "checking",
    lastCheck: null,
    nextCheck: null,
    feed: null,
  })
  const lastUpdated = useRef<string | null>(null)

  const verify = useCallback(async () => {
    const now = new Date()
    const next = new Date(now.getTime() + VERIFY_EVERY_MS)
    try {
      const feed = await fetchStatus()
      if (!feed) {
        setState({ phase: "bundled", lastCheck: now, nextCheck: next, feed: null })
        return
      }
      let phase: VerificationState["phase"] = "unchanged"
      if (feed.updated_at !== lastUpdated.current) {
        const res = await fetch(`${CSV_URL}?t=${Date.now()}`, { cache: "no-store" })
        if (res.ok) {
          onSeries(mergeS5p(base, parseS5pCsv(await res.text())))
          lastUpdated.current = feed.updated_at
          phase = "fresh"
        }
      }
      setState({ phase, lastCheck: now, nextCheck: next, feed })
    } catch {
      setState((s) => ({ ...s, phase: "offline", lastCheck: now, nextCheck: next }))
    }
  }, [base, onSeries])

  useEveryHour(verify)

  const verifyNow = useCallback(() => {
    setState((s) => ({ ...s, phase: "checking" }))
    return verify()
  }, [verify])

  return { ...state, verifyNow }
}
