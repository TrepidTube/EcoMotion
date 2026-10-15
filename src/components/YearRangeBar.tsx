export function YearRangeBar({
  first,
  last,
  value,
  onChange,
}: {
  first: number
  last: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [from, to] = value
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const span = Math.max(last - first, 1)
  const pct = (y: number) => ((y - first) / span) * 100

  return (
    <div className="year-bar">
      <div className="year-bar-track">
        <div className="year-bar-fill" style={{ left: `${pct(from)}%`, right: `${100 - pct(to)}%` }} />
        <input
          type="range"
          aria-label="Año inicial"
          min={first}
          max={last}
          step={1}
          value={from}
          onChange={(e) => onChange([Math.min(Number(e.target.value), to - 1), to])}
        />
        <input
          type="range"
          aria-label="Año final"
          min={first}
          max={last}
          step={1}
          value={to}
          onChange={(e) => onChange([from, Math.max(Number(e.target.value), from + 1)])}
        />
      </div>
      <div className="year-bar-ticks">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={y >= from && y <= to ? "in" : ""}
            style={{ left: `${pct(y)}%` }}
            onClick={() => {
              // Mueve el extremo más cercano al año pulsado.
              if (Math.abs(y - from) <= Math.abs(y - to)) onChange([Math.min(y, to - 1), to])
              else onChange([from, Math.max(y, from + 1)])
            }}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  )
}
