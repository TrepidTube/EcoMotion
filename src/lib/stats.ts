export type Point = { t: string; y: number }

function monthIndex(iso: string): number {
  const [y, m] = iso.split("-").map(Number)
  return y * 12 + (m - 1)
}

export function sliceWindow(points: Point[], start: string, end: string): Point[] {
  return points.filter((p) => p.t >= start && p.t <= end)
}

export function mean(xs: number[]): number {
  if (!xs.length) return NaN
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function olsTrend(points: Point[]): {
  slopePerYear: number
  intercept: number
  r2: number
  n: number
  pctChange: number
  fitted: Point[]
} {
  const n = points.length
  if (n < 3) {
    return { slopePerYear: NaN, intercept: NaN, r2: NaN, n, pctChange: NaN, fitted: [] }
  }
  const t0 = monthIndex(points[0].t)
  const xs = points.map((p) => (monthIndex(p.t) - t0) / 12)
  const ys = points.map((p) => p.y)
  const xBar = mean(xs)
  const yBar = mean(ys)
  let sxx = 0
  let sxy = 0
  let sst = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xBar
    sxx += dx * dx
    sxy += dx * (ys[i] - yBar)
    sst += (ys[i] - yBar) ** 2
  }
  const slopePerYear = sxy / sxx
  const intercept = yBar - slopePerYear * xBar
  let ssr = 0
  const fitted = points.map((p, i) => {
    const yhat = intercept + slopePerYear * xs[i]
    ssr += (ys[i] - yhat) ** 2
    return { t: p.t, y: yhat }
  })
  const r2 = sst === 0 ? 1 : 1 - ssr / sst
  const y0 = intercept
  const y1 = intercept + slopePerYear * xs[n - 1]
  const pctChange = y0 === 0 ? NaN : ((y1 - y0) / y0) * 100
  return { slopePerYear, intercept, r2, n, pctChange, fitted }
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * Math.abs(x))
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}

function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

/** Mann–Kendall + pendiente de Sen (tendencia no paramétrica). */
export function mannKendall(points: Point[]): {
  s: number
  z: number
  p: number
  senPerYear: number
  trend: "alza" | "baja" | "estable"
} {
  const n = points.length
  const ys = points.map((p) => p.y)
  let s = 0
  const slopes: number[] = []
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < j; i++) {
      const d = ys[j] - ys[i]
      if (d > 0) s += 1
      else if (d < 0) s -= 1
      const dtYears = (monthIndex(points[j].t) - monthIndex(points[i].t)) / 12
      if (dtYears !== 0) slopes.push(d / dtYears)
    }
  }
  const varS = (n * (n - 1) * (2 * n + 5)) / 18
  const z = s === 0 ? 0 : (s > 0 ? s - 1 : s + 1) / Math.sqrt(varS)
  const p = 2 * (1 - normCdf(Math.abs(z)))
  slopes.sort((a, b) => a - b)
  const senPerYear = slopes.length ? slopes[Math.floor(slopes.length / 2)] : NaN
  const trend = p >= 0.05 ? "estable" : senPerYear > 0 ? "alza" : "baja"
  return { s, z, p, senPerYear, trend }
}

export function deseasonalize(points: Point[]): Point[] {
  const monthMeans = Array.from({ length: 12 }, () => ({ s: 0, n: 0 }))
  for (const p of points) {
    const m = Number(p.t.slice(5, 7)) - 1
    monthMeans[m].s += p.y
    monthMeans[m].n += 1
  }
  const clim = monthMeans.map((x) => (x.n ? x.s / x.n : 0))
  const climMean = mean(clim.filter((x) => x !== 0))
  return points.map((p) => {
    const m = Number(p.t.slice(5, 7)) - 1
    return { t: p.t, y: p.y - clim[m] + climMean }
  })
}

export function annualMeans(points: Point[]): { year: number; y: number }[] {
  const acc = new Map<number, number[]>()
  for (const p of points) {
    const y = Number(p.t.slice(0, 4))
    const list = acc.get(y) ?? []
    list.push(p.y)
    acc.set(y, list)
  }
  return [...acc.entries()]
    .map(([year, ys]) => ({ year, y: mean(ys) }))
    .sort((a, b) => a.year - b.year)
}
