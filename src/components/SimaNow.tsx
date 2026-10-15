import { SIMA_STATIONS } from "../data/catalog"
import { AQ_LEVELS, aqLevel, pollutantUnit, type AqLevel, type SimaReading, type SimaSnapshot } from "../data/sima"
import { AqBadge, AqLegend } from "./AqBadge"

/** Estado horario de las 15 estaciones SIMA, plegado en un menú desplegable. */
export function SimaNow({
  snapshot,
  byStation,
  via,
  loading,
}: {
  snapshot: SimaSnapshot | null
  byStation: Map<string, SimaReading>
  via: "feed" | "proxy" | null
  loading: boolean
}) {
  const levels = SIMA_STATIONS.map((s) => aqLevel(byStation.get(s.id)?.index))
  const counts = levels.reduce<Partial<Record<AqLevel, number>>>((acc, lv) => ({ ...acc, [lv]: (acc[lv] ?? 0) + 1 }), {})
  const worst = SIMA_STATIONS.map((s) => ({ s, r: byStation.get(s.id) }))
    .filter((x) => x.r)
    .sort((a, b) => b.r!.index - a.r!.index)[0]

  return (
    <details className="card sima-now">
      <summary>
        <div className="sima-now-title">
          <span className="tag">SIMA · Índice AIRE y SALUD</span>
          <h3>{snapshot ? `Estaciones SIMA · ${snapshot.date.slice(11)} h` : "Estaciones SIMA"}</h3>
          <p className="muted">
            {snapshot
              ? `Promedio móvil oficial del ${snapshot.date.slice(0, 10)} · ${via === "proxy" ? "consulta directa a aire.nl.gob.mx" : "feed horario publicado"}`
              : loading
                ? "Consultando SIMA…"
                : "SIMA no respondió. En hosting estático publica el feed con scripts/fetch_sima.py."}
          </p>
        </div>
        <div className="sima-now-summary">
          {(Object.keys(AQ_LEVELS) as AqLevel[])
            .filter((lv) => counts[lv])
            .map((lv) => (
              <span key={lv} className="sima-count">
                <i className={`aq-dot aq-${lv}`} />
                {counts[lv]} {AQ_LEVELS[lv].label}
              </span>
            ))}
          {worst ? (
            <span className="sima-worst">
              Peor: <strong>{worst.s.name}</strong> <AqBadge index={worst.r!.index} pollutant={worst.r!.pollutant} />
            </span>
          ) : null}
          <span className="sima-toggle" aria-hidden="true">
            <span className="when-closed">Ver estaciones</span>
            <span className="when-open">Ocultar</span>
            <svg viewBox="0 0 20 20" width="16" height="16">
              <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </summary>

      <div className="sima-now-body">
        <AqLegend />
        <div className="station-grid">
          {SIMA_STATIONS.map((s) => {
            const r = byStation.get(s.id)
            return (
              <div key={s.id} className={`station-chip aq-edge-${aqLevel(r?.index)}`}>
                <div className="station-name">
                  <strong>{s.name}</strong>
                  <span>{s.municipality}</span>
                </div>
                <AqBadge index={r?.index} pollutant={r?.pollutant} />
                {r?.concentration != null ? (
                  <span className="station-conc">
                    {r.concentration} {pollutantUnit(r.pollutant)}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </details>
  )
}
