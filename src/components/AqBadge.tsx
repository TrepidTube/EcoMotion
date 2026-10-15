import { AQ_LEVELS, aqLevel, pollutantLabel, type AqLevel } from "../data/sima"

export function AqBadge({
  index,
  pollutant,
  level,
  compact = false,
}: {
  index: number | null | undefined
  pollutant?: string
  level?: AqLevel
  compact?: boolean
}) {
  const lv = level ?? aqLevel(index)
  return (
    <span className={`aq aq-${lv}`} title={`Índice AIRE y SALUD · riesgo ${AQ_LEVELS[lv].risk.toLowerCase()}`}>
      <i />
      {AQ_LEVELS[lv].label}
      {!compact && index != null && lv !== "none" ? (
        <b>
          {index}
          {pollutant ? ` · ${pollutantLabel(pollutant)}` : ""}
        </b>
      ) : null}
    </span>
  )
}

export function AqLegend() {
  return (
    <div className="aq-legend">
      {(["good", "ok", "bad", "verybad", "extreme", "none"] as AqLevel[]).map((lv) => (
        <span key={lv}>
          <i className={`aq-dot aq-${lv}`} />
          {AQ_LEVELS[lv].label}
          {lv !== "none" ? <small>{lv === "extreme" ? ">200" : `${AQ_LEVELS[lv].min}–${AQ_LEVELS[lv].min === 0 ? 50 : AQ_LEVELS[lv].min + 49}`}</small> : null}
        </span>
      ))}
    </div>
  )
}
