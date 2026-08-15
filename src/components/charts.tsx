import { useCallback, useRef, useState } from 'react'

/* ------------------------------------------------------------------ */
/* Gemeinsamer Tooltip                                                 */
/* ------------------------------------------------------------------ */

export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null)

  const show = useCallback((e: React.MouseEvent, html: string) => {
    setTip({ x: e.clientX, y: e.clientY, html })
  }, [])
  const hide = useCallback(() => setTip(null), [])

  const node = tip ? (
    <div
      className="tooltip on"
      style={{
        left: Math.min(Math.max(tip.x - 70, 8), window.innerWidth - 190),
        top: tip.y > 90 ? tip.y - 58 : tip.y + 20,
      }}
      dangerouslySetInnerHTML={{ __html: tip.html }}
    />
  ) : null

  return { show, hide, node }
}

type Tip = ReturnType<typeof useTooltip>

const fmt = (n: number, d = 0) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })

/* ------------------------------------------------------------------ */
/* Gruppiertes Balkendiagramm — Monatswerte                            */
/* ------------------------------------------------------------------ */

export function MonthlyBars({
  labels,
  series,
  unit,
  tip,
}: {
  labels: readonly string[]
  series: { name: string; color: string; data: number[] }[]
  unit: string
  tip: Tip
}) {
  const W = 720
  const H = 240
  const padL = 34
  const padR = 6
  const padT = 10
  const padB = 26

  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const step = niceStep(max / 4)
  const top = Math.ceil(max / step) * step

  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = plotW / labels.length
  const barW = Math.max(2, (groupW - 5) / series.length - 2)

  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)

  return (
    <div className="chartwrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((v) => {
          const y = padT + plotH - (v / top) * plotH
          return (
            <g key={v}>
              <line className="grid" x1={padL} y1={y} x2={W - padR} y2={y} />
              <text x={padL - 7} y={y + 3.5} textAnchor="end">{fmt(v)}</text>
            </g>
          )
        })}
        <line className="axis" x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} />

        {labels.map((label, i) => {
          const gx = padL + i * groupW
          return (
            <g key={label}>
              {series.map((s, si) => {
                const v = s.data[i] ?? 0
                const h = Math.max(0, (v / top) * plotH)
                const x = gx + 2.5 + si * (barW + 2)
                return (
                  <rect
                    key={s.name}
                    x={x}
                    y={padT + plotH - h}
                    width={barW}
                    height={h}
                    rx={Math.min(3, barW / 2)}
                    fill={s.color}
                    onMouseMove={(e) =>
                      tip.show(e, `<span class="tt">${s.name} · ${label}</span>${fmt(v)} ${unit}`)
                    }
                    onMouseLeave={tip.hide}
                  />
                )
              })}
              <text x={gx + groupW / 2} y={H - 8} textAnchor="middle">{label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Kumulierter Cashflow über die Laufzeit                              */
/* ------------------------------------------------------------------ */

export function CashflowChart({
  rows,
  breakEven,
  tip,
}: {
  rows: { year: number; cumulative: number }[]
  breakEven: number | null
  tip: Tip
}) {
  const W = 720
  const H = 240
  const padL = 46
  const padR = 10
  const padT = 12
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const values = rows.map((r) => r.cumulative)
  const lo = Math.min(0, ...values)
  const hi = Math.max(0, ...values)
  const step = niceStep(Math.max(hi - lo, 1) / 4)
  const top = Math.ceil(hi / step) * step
  const bottom = Math.floor(lo / step) * step
  const span = top - bottom || 1

  const x = (year: number) => padL + (year / (rows.length - 1)) * plotW
  const y = (v: number) => padT + plotH - ((v - bottom) / span) * plotH

  const line = rows.map((r) => `${x(r.year)},${y(r.cumulative)}`).join(' ')
  const area = `${padL},${y(0)} ${line} ${x(rows.length - 1)},${y(0)}`

  const ticks: number[] = []
  for (let v = bottom; v <= top + 0.001; v += step) ticks.push(v)

  const zeroY = y(0)

  return (
    <div className="chartwrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          <linearGradient id="cfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--good)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--good)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} />
            <text x={padL - 7} y={y(v) + 3.5} textAnchor="end">{fmt(v)}</text>
          </g>
        ))}

        <polygon points={area} fill="url(#cfFill)" />
        <line className="axis" x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} />
        <polyline points={line} fill="none" stroke="var(--good)" strokeWidth={2} strokeLinejoin="round" />

        {breakEven !== null && breakEven <= rows.length - 1 && (
          <g>
            <line
              x1={x(breakEven)} y1={padT} x2={x(breakEven)} y2={padT + plotH}
              stroke="var(--key)" strokeWidth={1.5} strokeDasharray="4 3"
            />
            <circle cx={x(breakEven)} cy={zeroY} r={4.5} fill="var(--key)" stroke="var(--surface)" strokeWidth={2} />
            <text x={x(breakEven) + 7} y={padT + 11} fill="var(--key)" style={{ fontWeight: 600 }}>
              {fmt(breakEven, 1)} J
            </text>
          </g>
        )}

        {rows.map((r) => (
          <rect
            key={r.year}
            x={x(r.year) - plotW / (rows.length - 1) / 2}
            y={padT}
            width={plotW / (rows.length - 1)}
            height={plotH}
            fill="transparent"
            onMouseMove={(e) =>
              tip.show(e, `<span class="tt">Jahr ${r.year}</span>${fmt(r.cumulative)} €`)
            }
            onMouseLeave={tip.hide}
          />
        ))}

        {rows
          .filter((r) => r.year % 5 === 0)
          .map((r) => (
            <text key={r.year} x={x(r.year)} y={H - 8} textAnchor="middle">
              {r.year === 0 ? 'Kauf' : `J${r.year}`}
            </text>
          ))}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tagesverlauf: Erzeugung, Last, Speicherstand                        */
/* ------------------------------------------------------------------ */

export function DayChart({
  pv,
  load,
  soc,
  hasBattery,
  tip,
}: {
  pv: number[]
  load: number[]
  soc: number[]
  hasBattery: boolean
  tip: Tip
}) {
  const W = 720
  const H = 220
  const padL = 40
  const padR = 40
  const padT = 12
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(0.001, ...pv, ...load)
  const step = niceStep(max / 3)
  const top = Math.ceil(max / step) * step

  const x = (h: number) => padL + (h / 23) * plotW
  const y = (v: number) => padT + plotH - (v / top) * plotH
  const ySoc = (v: number) => padT + plotH - v * plotH

  const pvArea = `${padL},${padT + plotH} ${pv.map((v, h) => `${x(h)},${y(v)}`).join(' ')} ${W - padR},${padT + plotH}`
  const loadLine = load.map((v, h) => `${x(h)},${y(v)}`).join(' ')
  const socLine = soc.map((v, h) => `${x(h)},${ySoc(v)}`).join(' ')

  const ticks: number[] = []
  for (let v = 0; v <= top + 0.0001; v += step) ticks.push(v)

  return (
    <div className="chartwrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        <defs>
          <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pv)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--pv)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} />
            <text x={padL - 7} y={y(v) + 3.5} textAnchor="end">{v.toFixed(1)}</text>
          </g>
        ))}

        {hasBattery && (
          <>
            <text x={W - padR + 7} y={ySoc(1) + 3.5}>100%</text>
            <text x={W - padR + 7} y={ySoc(0) + 3.5}>0%</text>
            <polyline
              points={socLine}
              fill="none"
              stroke="var(--soc)"
              strokeWidth={2}
              strokeDasharray="5 3"
              strokeLinejoin="round"
            />
          </>
        )}

        <polygon points={pvArea} fill="url(#pvFill)" />
        <polyline points={pv.map((v, h) => `${x(h)},${y(v)}`).join(' ')} fill="none" stroke="var(--pv)" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={loadLine} fill="none" stroke="var(--load)" strokeWidth={2} strokeLinejoin="round" />
        <line className="axis" x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} />

        {pv.map((_, h) => (
          <rect
            key={h}
            x={x(h) - plotW / 46}
            y={padT}
            width={plotW / 23}
            height={plotH}
            fill="transparent"
            onMouseMove={(e) =>
              tip.show(
                e,
                `<span class="tt">${String(h).padStart(2, '0')}:00 Uhr</span>` +
                  `PV ${fmt(pv[h] * 1000)} W · Last ${fmt(load[h] * 1000)} W` +
                  (hasBattery ? ` · Speicher ${fmt(soc[h] * 100)} %` : ''),
              )
            }
            onMouseLeave={tip.hide}
          />
        ))}

        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 8} textAnchor="middle">
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empfindlichkeit: Kennzahl über einen Parameterbereich               */
/* ------------------------------------------------------------------ */

export function SweepChart({
  points,
  current,
  xLabel,
  yLabel,
  format,
  tip,
}: {
  points: { x: number; y: number }[]
  current: number
  xLabel: (v: number) => string
  yLabel: string
  format: (v: number) => string
  tip: Tip
}) {
  const W = 720
  const H = 200
  const padL = 46
  const padR = 12
  const padT = 12
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMax = Math.max(1, ...ys)
  const step = niceStep(yMax / 3)
  const top = Math.ceil(yMax / step) * step

  const x = (v: number) => padL + ((v - xMin) / (xMax - xMin || 1)) * plotW
  const y = (v: number) => padT + plotH - (v / top) * plotH

  const line = points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')

  const ticks: number[] = []
  for (let v = 0; v <= top + 0.0001; v += step) ticks.push(v)

  const nearest = points.reduce((a, b) =>
    Math.abs(b.x - current) < Math.abs(a.x - current) ? b : a,
  )

  const ref = useRef<SVGSVGElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const svg = ref.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * W
    const vx = xMin + ((rel - padL) / plotW) * (xMax - xMin)
    const p = points.reduce((a, b) => (Math.abs(b.x - vx) < Math.abs(a.x - vx) ? b : a))
    tip.show(e, `<span class="tt">${xLabel(p.x)}</span>${yLabel} ${format(p.y)}`)
  }

  return (
    <div className="chartwrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} ref={ref} role="img"
           onMouseMove={onMove} onMouseLeave={tip.hide}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} />
            <text x={padL - 7} y={y(v) + 3.5} textAnchor="end">{format(v)}</text>
          </g>
        ))}
        <line className="axis" x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} />
        <polyline points={line} fill="none" stroke="var(--key)" strokeWidth={2} strokeLinejoin="round" />

        <line
          x1={x(nearest.x)} y1={padT} x2={x(nearest.x)} y2={padT + plotH}
          stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3"
        />
        <circle cx={x(nearest.x)} cy={y(nearest.y)} r={5} fill="var(--key)" stroke="var(--surface)" strokeWidth={2} />
        <text
          x={x(nearest.x) + (x(nearest.x) > padL + plotW * 0.72 ? -8 : 8)}
          y={Math.max(padT + 10, y(nearest.y) - 9)}
          textAnchor={x(nearest.x) > padL + plotW * 0.72 ? 'end' : 'start'}
          fill="var(--ink)"
          style={{ fontWeight: 600 }}
        >
          jetzt: {format(nearest.y)}
        </text>

        {points
          .filter((_, i) => i % Math.ceil(points.length / 6) === 0)
          .map((p) => (
            <text key={p.x} x={x(p.x)} y={H - 8} textAnchor="middle">{xLabel(p.x)}</text>
          ))}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function niceStep(rough: number): number {
  if (rough <= 0) return 1
  const exp = Math.floor(Math.log10(rough))
  const base = Math.pow(10, exp)
  const norm = rough / base
  const snapped = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return snapped * base
}
