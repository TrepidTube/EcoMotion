import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { GUIDELINES, type Pollutant } from "../data/catalog"

type Row = {
  t: string
  satellite: number
  surface: number
  trend: number
}

export function TrendChart({
  rows,
  pollutant,
  mode,
}: {
  rows: Row[]
  pollutant: Pollutant
  mode: "surface" | "satellite"
}) {
  const g = GUIDELINES[pollutant]
  const oms = mode === "surface" ? g.omsAnnual : null
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(28,23,41,0.07)" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#6b6280", fontSize: 11 }} interval={11} />
          <YAxis
            tick={{ fill: "#6b6280", fontSize: 11 }}
            width={72}
            tickFormatter={(v: number) =>
              mode === "satellite" ? v.toExponential(1) : v.toFixed(0)
            }
          />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid rgba(28,23,41,0.1)", borderRadius: 12, boxShadow: "0 10px 30px -12px rgba(28,23,41,0.25)", fontSize: 12 }}
            labelStyle={{ color: "#1c1729", fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {mode === "surface" ? (
            <Line type="monotone" dataKey="surface" name="Superficie (µg/m³)" stroke="#6b7c3a" dot={false} strokeWidth={2.5} />
          ) : (
            <Line
              type="monotone"
              dataKey="satellite"
              name="Sentinel-5P (mol/m²)"
              stroke="#4a7aa6"
              dot={false}
              strokeWidth={2}
            />
          )}
          <Line type="monotone" dataKey="trend" name="Línea de tendencia (OLS)" stroke="#ea580c" dot={false} strokeWidth={2} strokeDasharray="6 4" />
          {oms ? <ReferenceLine y={oms} stroke="#c14747" strokeDasharray="4 4" label={{ value: "OMS anual", fill: "#c14747", fontSize: 11 }} /> : null}
          {mode === "surface" && g.nomAnnual ? (
            <ReferenceLine y={g.nomAnnual} stroke="#c98a2b" strokeDasharray="3 6" label={{ value: "NOM anual", fill: "#c98a2b", fontSize: 11 }} />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
