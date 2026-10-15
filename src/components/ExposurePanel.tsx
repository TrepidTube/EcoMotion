import { useMemo, useState } from "react"
import { AFOROS_URL, computeExposure, type AforoFeed } from "../data/aforos"
import { buildDemo } from "../data/aforosDemo"
import { SIMA_STATIONS } from "../data/catalog"
import { aqLevel, type SimaSnapshot } from "../data/sima"
import { AqBadge } from "./AqBadge"

const THRESHOLDS = [
  { min: 51, label: "Aceptable o peor", note: "grupos sensibles" },
  { min: 101, label: "Mala o peor", note: "toda la población" },
  { min: 151, label: "Muy mala o peor", note: "riesgo muy alto" },
]

const fmt = (n: number) => n.toLocaleString("es-MX")

export function ExposurePanel({ feed, history }: { feed: AforoFeed | null; history: SimaSnapshot[] }) {
  const [threshold, setThreshold] = useState(101)
  const [day, setDay] = useState<string | undefined>(undefined)
  // Mientras no haya conteos reales publicados se muestra el ejemplo simulado.
  const demo = useMemo(() => buildDemo(), [])
  const realSummary = useMemo(
    () => (feed ? computeExposure(feed, history, threshold, day) : null),
    [feed, history, threshold, day],
  )
  const demoSummary = useMemo(
    () => computeExposure(demo.feed, demo.history, threshold, day),
    [demo, threshold, day],
  )
  const isDemo = !realSummary
  const activeFeed = isDemo ? demo.feed : feed!
  const summary = (realSummary ?? demoSummary)!

  const controls = (
    <div className="segmented">
      {THRESHOLDS.map((t) => (
        <button key={t.min} type="button" className={t.min === threshold ? "on" : ""} onClick={() => setThreshold(t.min)}>
          {t.label}
        </button>
      ))}
    </div>
  )

  const pct = summary.counted ? (summary.exposed / summary.counted) * 100 : 0
  const peak = Math.max(...summary.byHour.map((h) => h.counted), 1)
  const thr = THRESHOLDS.find((t) => t.min === threshold)!

  return (
    <>
      {isDemo ? (
        <div className="demo-banner" role="status">
          <strong>Ejemplo con datos simulados</strong>
          <span>
            Sensores e índices SIMA inventados para mostrar la gráfica. No son conteos reales; se reemplazan solos
            cuando se publique <code>{AFOROS_URL}</code>.
          </span>
        </div>
      ) : null}
      <div className="exposure-controls">
        <div className="control">
          <span className="control-label">Umbral SIMA</span>
          {controls}
        </div>
        <div className="control">
          <span className="control-label">Día</span>
          <select value={summary.day} onChange={(e) => setDay(e.target.value)}>
            {summary.days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="exposure-grid">
        <article className="card exposure-hero">
          <span className="tag-light">Personas expuestas · {summary.day}</span>
          <div className="exposure-big">{fmt(summary.exposed)}</div>
          <p>
            pasaron por zonas con aire <strong>{thr.label.toLowerCase()}</strong> ({thr.note}) — {pct.toFixed(1)}% de{" "}
            {fmt(summary.counted)} personas contadas.
          </p>
          {summary.unknown ? (
            <p className="exposure-unknown">
              {fmt(summary.unknown)} contadas en horas sin índice SIMA (estación en mantenimiento o sin historial).
            </p>
          ) : null}
        </article>

        <article className="card exposure-hours">
          <span className="tag">Por hora</span>
          <h3>Conteo y calidad del aire en cada hora</h3>
          <div className="hour-bars" role="img" aria-label="Personas contadas por hora y nivel SIMA">
            {summary.byHour.map((h) => (
              <div key={h.hour} className="hour-col" title={`${h.hour}:00 · ${fmt(h.counted)} contadas · ${fmt(h.exposed)} expuestas`}>
                <div className="hour-bar">
                  <div className={`hour-fill aq-${aqLevel(h.worstIndex)}`} style={{ height: `${(h.counted / peak) * 100}%` }}>
                    <div className="hour-exposed" style={{ height: h.counted ? `${(h.exposed / h.counted) * 100}%` : 0 }} />
                  </div>
                </div>
                <span>{h.hour % 3 === 0 ? h.hour : ""}</span>
              </div>
            ))}
          </div>
          <p className="muted small">
            Color = peor índice SIMA de la hora · franja oscura = personas sobre el umbral.
          </p>
        </article>
      </div>

      <article className="card exposure-table">
        <table>
          <thead>
            <tr>
              <th>Estación SIMA</th>
              <th>Sensores</th>
              <th>Contadas</th>
              <th>Expuestas</th>
              <th>Peor índice del día</th>
            </tr>
          </thead>
          <tbody>
            {summary.byStation.map((s) => {
              const st = SIMA_STATIONS.find((x) => x.id === s.station)
              return (
                <tr key={s.station}>
                  <td>
                    {st?.name ?? s.station}
                    <span className="muted"> · {st?.municipality ?? "—"}</span>
                  </td>
                  <td>{s.sensors}</td>
                  <td>{fmt(s.counted)}</td>
                  <td>
                    <strong>{fmt(s.exposed)}</strong>
                  </td>
                  <td>
                    <AqBadge index={s.worstIndex} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="muted small">
          Los sensores cuentan pasos: una misma persona puede sumar en varias horas o puntos. Fuente:{" "}
          {isDemo ? (
            <strong>datos simulados (ejemplo)</strong>
          ) : (
            <>
              <code>{AFOROS_URL}</code> · actualizado {new Date(activeFeed.updated_at).toLocaleString("es-MX")}
            </>
          )}
          .
        </p>
      </article>
    </>
  )
}
