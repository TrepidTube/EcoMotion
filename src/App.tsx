import { useCallback, useMemo, useState } from "react"
import { AqBadge } from "./components/AqBadge"
import { ExposurePanel } from "./components/ExposurePanel"
import { NlMap } from "./components/NlMap"
import { SimaNow } from "./components/SimaNow"
import { TrendChart } from "./components/TrendChart"
import { YearRangeBar } from "./components/YearRangeBar"
import {
  GUIDELINES,
  POLLUTANTS,
  REGIONS,
  S5P_COLLECTIONS,
  SIMA_HOME_URL,
  type Pollutant,
  type RegionId,
} from "./data/catalog"
import { SERIES, type SeriesPack } from "./data/buildSeries"
import { latestMonth, yearSpan } from "./data/liveData"
import { readingByStation, regionStatus } from "./data/sima"
import { assessHealth, no2RelativeRisk } from "./lib/health"
import { annualMeans, deseasonalize, mannKendall, olsTrend, sliceWindow } from "./lib/stats"
import { useHourlyVerification } from "./lib/useHourlyVerification"
import { useLiveFeeds } from "./lib/useLiveFeeds"
import "./App.css"

const POLLUTANT_LABEL: Record<Pollutant, string> = { NO2: "NO₂", SO2: "SO₂", CO: "CO" }

const REGION_TILE: Record<RegionId, { initials: string; tone: string; tag: string }> = {
  estatal: { initials: "NL", tone: "olive", tag: "Estatal" },
  amm: { initials: "AM", tone: "orange", tag: "Metropolitana" },
  industrial_este: { initials: "CP", tone: "red", tag: "Industrial" },
  occidente: { initials: "OC", tone: "amber", tag: "Carga" },
  norte: { initials: "NO", tone: "blue", tag: "Rural" },
  sur: { initials: "SU", tone: "green", tag: "Control" },
}

const SOURCES = [
  "Sentinel-5P · TROPOMI",
  "Google Earth Engine",
  "Red SIMA Nuevo León",
  "OMS 2021",
  "NOM-021-SSA1",
  "NOM-022-SSA1",
  "NOM-023-SSA1",
  "INECC",
  "Goldberg et al. 2026",
]

const VERIFY_TEXT = {
  checking: "Consultando el feed…",
  fresh: "Datos nuevos de Sentinel-5P cargados",
  unchanged: "Sin cambios desde la última verificación",
  bundled: "Sin feed publicado · usando la serie empaquetada",
  offline: "Sin conexión · se reintenta en la próxima hora",
} as const

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function formatMonth(iso: string) {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

export default function App() {
  const [pollutant, setPollutant] = useState<Pollutant>("NO2")
  const [regionId, setRegionId] = useState<RegionId>("amm")
  const [series, setSeries] = useState<SeriesPack>(SERIES)
  const span = yearSpan(series)
  const [range, setRange] = useState<[number, number]>([span.last - 4, span.last])
  const onSeries = useCallback((next: SeriesPack) => setSeries(next), [])
  const verification = useHourlyVerification(SERIES, onSeries)
  const live = useLiveFeeds()
  const byStation = useMemo(() => readingByStation(live.sima), [live.sima])
  const [mode, setMode] = useState<"surface" | "satellite">("surface")

  const region = REGIONS.find((r) => r.id === regionId)!
  // Si llegan años nuevos, la barra se recorta al rango disponible.
  const fromYear = Math.max(range[0], span.first)
  const toYear = Math.min(range[1], span.last)
  const win = { start: `${fromYear}-01`, end: `${toYear}-12` }
  const lastMonth = latestMonth(series)
  const g = GUIDELINES[pollutant]
  const s5p = S5P_COLLECTIONS[pollutant]

  const analysis = useMemo(() => {
    const raw = series[regionId][pollutant]
    const windowed = sliceWindow(
      raw.map((o) => ({ t: o.t, y: mode === "surface" ? o.surface : o.satellite })),
      win.start,
      win.end,
    )
    const surfaceW = sliceWindow(
      raw.map((o) => ({ t: o.t, y: o.surface })),
      win.start,
      win.end,
    )
    const p95W = sliceWindow(
      raw.map((o) => ({ t: o.t, y: o.p95 })),
      win.start,
      win.end,
    )
    const satW = sliceWindow(
      raw.map((o) => ({ t: o.t, y: o.satellite })),
      win.start,
      win.end,
    )
    const ols = olsTrend(deseasonalize(windowed))
    const mk = mannKendall(deseasonalize(windowed))
    const health = assessHealth(pollutant, surfaceW, p95W)
    const fittedMap = new Map(olsTrend(windowed).fitted.map((p) => [p.t, p.y]))
    const rows = windowed.map((p, i) => ({
      t: p.t,
      satellite: satW[i].y,
      surface: surfaceW[i].y,
      trend: fittedMap.get(p.t) ?? p.y,
    }))
    return {
      ols,
      mk,
      health,
      rows,
      annual: annualMeans(surfaceW),
      meanSat: satW.reduce((a, p) => a + p.y, 0) / satW.length,
      meanSurf: surfaceW.reduce((a, p) => a + p.y, 0) / surfaceW.length,
    }
  }, [series, pollutant, regionId, mode, win.start, win.end])

  const rr = pollutant === "NO2" ? no2RelativeRisk(analysis.health.annualMean) : null
  const omsRatio = analysis.health.omsRatio
  const headlineStat = omsRatio
    ? `${omsRatio.toFixed(1)}× la guía OMS`
    : analysis.health.daysOverOms24hPct != null
      ? `${analysis.health.daysOverOms24hPct.toFixed(0)}% de meses sobre OMS 24 h`
      : `${analysis.meanSurf.toFixed(1)} ${g.unit}`

  return (
    <div className="page">
      <header className="nav-wrap">
        <nav className="nav">
          <a className="brand" href="#top">
            <span className="brand-mark">EM</span>
            <span>
              Eco<em>Motion</em>
            </span>
          </a>
          <div className="nav-links">
            <a href="#analisis">Análisis</a>
            <a href="#regiones">Regiones</a>
            <a href="#exposicion">Exposición</a>
            <a href="#salud">Salud</a>
          </div>
          <div className="nav-actions">
          
            <a className="btn btn-sm" href={SIMA_HOME_URL} target="_blank" rel="noreferrer">
              SIMA en vivo
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* ---------- CONTROLES + BENTO ---------- */}
        <section id="analisis" className="section container">
          <div className="section-head">
            <p className="eyebrow">01 · Análisis</p>
            <h2>
              Elige qué medir.
              <br />
              La tendencia hace el resto.
            </h2>
            <p className="section-lede">
              Cambia contaminante, años y serie. Todo el tablero se recalcula al instante con los mismos
              criterios estadísticos.
            </p>
          </div>

          <div className="controls">
            <div className="control">
              <span className="control-label">Contaminante</span>
              <div className="segmented">
                {POLLUTANTS.map((p) => (
                  <button key={p} className={p === pollutant ? "on" : ""} onClick={() => setPollutant(p)} type="button">
                    {POLLUTANT_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="control">
              <span className="control-label">Serie</span>
              <div className="segmented">
                <button className={mode === "surface" ? "on" : ""} onClick={() => setMode("surface")} type="button">
                  Superficie (salud)
                </button>
                <button className={mode === "satellite" ? "on" : ""} onClick={() => setMode("satellite")} type="button">
                  Sentinel-5P
                </button>
              </div>
            </div>
            <div className="control">
              <span className="control-label">Región</span>
              <select value={regionId} onChange={(e) => setRegionId(e.target.value as RegionId)}>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="control control-years">
              <span className="control-label">
                Años · {fromYear}–{toYear}
                <em>
                  {toYear - fromYear + 1} años · serie disponible {span.first}–{formatMonth(lastMonth)}
                </em>
              </span>
              <YearRangeBar first={span.first} last={span.last} value={[fromYear, toYear]} onChange={setRange} />
            </div>
            <div className={`verify-strip ${verification.phase}`}>
              <span className="verify-dot" />
              <strong>Verificación cada hora</strong>
              <span>{VERIFY_TEXT[verification.phase]}</span>
              {verification.lastCheck ? <span>Última: {formatTime(verification.lastCheck)}</span> : null}
              {verification.nextCheck ? <span>Próxima: {formatTime(verification.nextCheck)}</span> : null}
              <span>
                SIMA:{" "}
                {live.loading ? "consultando…" : live.sima ? `lectura ${live.sima.date.slice(11)} h` : "sin respuesta"}
              </span>
              <button
                type="button"
                onClick={() => {
                  void verification.verifyNow()
                  void live.refreshNow()
                }}
                disabled={verification.phase === "checking" || live.loading}
              >
                Verificar ahora
              </button>
            </div>
          </div>

          <div className="bento">
            <article className="card card-chart">
              <div className="card-head">
                <span className="tag">Tendencia</span>
                <h3>
                  {g.name} · {region.name}
                </h3>
                <p className="muted">
                  {mode === "satellite"
                    ? `Columna ${s5p.band} · ${s5p.id}. Unidades ${s5p.unit}. Verificación satelital independiente.`
                    : "Concentración superficial en µg/m³: la métrica que usa el sector salud (OMS y NOM-SSA1)."}
                </p>
              </div>
              <TrendChart rows={analysis.rows} pollutant={pollutant} mode={mode} />
            </article>

            <article className="card card-brand">
              <span className="tag-light">02 · Mann–Kendall</span>
              <h3>Tendencia {analysis.mk.trend}.</h3>
              <p>
                p = {analysis.mk.p.toFixed(3)} · pendiente de Sen {analysis.mk.senPerYear >= 0 ? "+" : ""}
                {analysis.mk.senPerYear.toExponential(2)}/año
              </p>
              <div className="big-num">{analysis.mk.p < 0.05 ? "Significativa" : "No significativa"}</div>
            </article>

            <article className="card card-cream">
              <span className="tag">03 · OLS</span>
              <h3>
                {analysis.ols.pctChange >= 0 ? "+" : ""}
                {analysis.ols.pctChange.toFixed(1)}% en la ventana.
              </h3>
              <p className="muted">
                Pendiente {analysis.ols.slopePerYear >= 0 ? "+" : ""}
                {analysis.ols.slopePerYear.toExponential(2)} / año · R² {analysis.ols.r2.toFixed(2)}
              </p>
            </article>
          </div>

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Media ventana (superficie)</span>
              <strong>
                {analysis.meanSurf.toFixed(1)} <small>{g.unit}</small>
              </strong>
              <em>
                {g.omsAnnual ? `${(omsRatio! * 100).toFixed(0)}% de la guía OMS anual` : "OMS no define media anual"}
              </em>
            </div>
            <div className="stat">
              <span className="stat-label">Columna Sentinel-5P</span>
              <strong>
                {analysis.meanSat.toExponential(2)} <small>mol/m²</small>
              </strong>
              <em>Independiente de la red estatal</em>
            </div>
            <div className="stat">
              <span className="stat-label">Guía OMS</span>
              <strong>
                {g.omsAnnual ?? g.oms24h} <small>{g.unit}</small>
              </strong>
              <em>{g.omsAnnual ? "Media anual" : "Media 24 h (sin guía anual)"}</em>
            </div>
            <div className="stat">
              <span className="stat-label">{rr ? "Riesgo relativo resp." : "Grupo de riesgo"}</span>
              <strong>{rr ? rr.toFixed(3) : POLLUTANT_LABEL[pollutant]}</strong>
              <em>{rr ? "vs. 10 µg/m³ de NO₂" : "Ver enfoque de salud"}</em>
            </div>
          </div>
        </section>

        {/* ---------- REGIONES (estilo hardware) ---------- */}
        <section id="regiones" className="section container">
          <div className="section-head">
            <p className="eyebrow">Recorte estatal</p>
          </div>

          <SimaNow snapshot={live.sima} byStation={byStation} via={live.simaVia} loading={live.loading} />

          <div className="region-grid">
            {REGIONS.map((r) => {
              const tile = REGION_TILE[r.id]
              const status = regionStatus(r.id, byStation)
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`region-card aq-edge-${status.level} ${r.id === regionId ? "on" : ""}`}
                  onClick={() => setRegionId(r.id)}
                >
                  <div className="region-top">
                    <span className={`tile ${tile.tone}`}>{tile.initials}</span>
                    <span className="tag">{tile.tag}</span>
                  </div>
                  <h3>{r.name}</h3>
                  <span className="region-sub">
                    Prioridad {r.healthPriority} · {(r.populationShare * 100).toFixed(r.populationShare < 0.1 ? 1 : 0)}%
                    pob.
                  </span>
                  <p>{r.blurb}</p>
                  <div className="region-status">
                    {status.stations ? (
                      <>
                        <AqBadge index={status.worst?.index} pollutant={status.worst?.pollutant} level={status.level} />
                        <span>
                          {status.reporting}/{status.stations} estaciones SIMA
                        </span>
                      </>
                    ) : (
                      <>
                        <AqBadge index={null} level="none" compact />
                        <span>Sin estación SIMA en la zona</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <article className="card map-card">
            <NlMap regionId={regionId} onSelect={setRegionId} byStation={byStation} />
            <div className="map-legend">
              <span>
                <i className="lg brand" /> Regiones de análisis (seleccionada con borde oscuro)
              </span>
              <span>
                <i className="lg aq-scale" /> Estaciones SIMA coloreadas por índice AIRE y SALUD
              </span>
            </div>
          </article>
        </section>

        {/* ---------- EXPOSICIÓN (conteo de personas) ---------- */}
        <section id="exposicion" className="section container">
          <div className="section-head">
            <p className="eyebrow">Impacto diario</p>
            <h2>
              ¿Cuántas personas
              <br />
              respiran ese aire?
            </h2>
            <p className="section-lede">
              Sensores de conteo en puntos de paso, cruzados hora por hora con el índice SIMA de su estación. El
              resultado: cuántas personas pasaron cada día por zonas con aire de mala calidad.
            </p>
          </div>
          <ExposurePanel feed={live.aforos} history={live.history} />
        </section>

        {/* ---------- SALUD (banda oscura) ---------- */}
        <section id="salud" className="dark-band">
          <div className="container dark-grid">
            <div>
              <p className="eyebrow light">Enfoque sector salud</p>
              <h2>
                {POLLUTANT_LABEL[pollutant]} en {region.name}: {headlineStat}.
              </h2>
              <p className={`pill ${analysis.health.band}`}>{analysis.health.headline}</p>
              <p className="dark-lede">{analysis.health.detail}</p>
              <ul className="check-list">
                <li>
                  Promedio en ventana: <strong>{analysis.health.annualMean.toFixed(1)} µg/m³</strong>
                </li>
                {g.omsAnnual ? (
                  <li>
                    Guía OMS anual: {g.omsAnnual} µg/m³
                    {omsRatio ? ` · razón ${omsRatio.toFixed(2)}×` : ""}
                  </li>
                ) : (
                  <li>OMS 24 h: {g.oms24h} µg/m³ (no hay guía anual)</li>
                )}
                {g.nomAnnual ? <li>NOM anual: {g.nomAnnual} µg/m³ — cumplir NOM no equivale a cumplir OMS</li> : null}
                {analysis.health.daysOverOms24hPct != null ? (
                  <li>Meses cuyo p95 supera la guía OMS 24 h: {analysis.health.daysOverOms24hPct.toFixed(0)}%</li>
                ) : null}
              </ul>
            </div>
            <div className="annual-card">
              <h3>Promedios anuales</h3>
              <p className="annual-sub">Superficie · µg/m³</p>
              <table>
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>µg/m³</th>
                    <th>OMS</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.annual.map((a) => {
                    const over = g.omsAnnual ? a.y > g.omsAnnual : null
                    return (
                      <tr key={a.year}>
                        <td>{a.year}</td>
                        <td>{a.y.toFixed(1)}</td>
                        <td>
                          <span className={`badge ${over == null ? "na" : over ? "bad" : "ok"}`}>
                            {over == null ? "n/a" : over ? "rebasa" : "dentro"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="marquee" aria-label="Fuentes">
          <p className="marquee-title">Fuentes y normas usadas en EcoMotion</p>
          <div className="marquee-track">
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <span key={i}>
                {s} <i>●</i>
              </span>
            ))}
          </div>
        </div>
        
      </footer>
    </div>
  )
}
