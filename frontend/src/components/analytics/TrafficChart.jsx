import { useMemo, useRef, useState } from 'react'

/* Two categorical hues picked specifically for this chart — neither collides
   with a color the rest of the app already treats as meaningful (accent
   orange = build/commerce, ai cyan = AI-generated content, stage
   green/amber/red = mod-difficulty, gold = favorites). Validated as an
   adjacent categorical pair against this app's dark surface (#141414) via
   the dataviz skill's validate_palette.js — CVD ΔE 16.0, normal-vision ΔE
   19.7, both well clear of the pass thresholds. */
const SERIES = [
  { key: 'pageviews', label: 'Page views', color: '#9085e9' },
  { key: 'visitors',  label: 'Visitors',   color: '#d55181' },
]

const WIDTH  = 760
const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

/* Rounds up to a "clean" axis max (1/2/5 × a power of ten) so gridline
   labels read as 0 / 25 / 50 rather than 0 / 23.75 / 47.5. */
function niceMax(value) {
  if (value <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function formatDay(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TrafficChart({ daily }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const [showTable, setShowTable]   = useState(false)
  const svgRef = useRef(null)

  const maxValue = useMemo(() => {
    const max = Math.max(1, ...daily.map((d) => Math.max(d.pageviews, d.visitors)))
    return niceMax(max)
  }, [daily])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f))
  const labelEvery = Math.max(1, Math.ceil(daily.length / 6))

  const xFor = (i) => (daily.length <= 1 ? PAD.left : PAD.left + (i / (daily.length - 1)) * PLOT_W)
  const yFor = (v) => PAD.top + PLOT_H - (v / maxValue) * PLOT_H
  const linePath = (key) => daily.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d[key])}`).join(' ')

  const updateHoverFromClientX = (clientX) => {
    if (!svgRef.current || daily.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * WIDTH
    const ratio = Math.min(1, Math.max(0, (relX - PAD.left) / PLOT_W))
    setHoverIndex(Math.round(ratio * (daily.length - 1)))
  }

  const hovered = hoverIndex != null ? daily[hoverIndex] : null

  if (daily.length === 0) {
    return <div className="text-muted text-sm py-12 text-center">No traffic data for this period yet.</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-5">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-0.5 rounded-full" style={{ background: s.color }} />
              <span className="text-body text-xs font-mono uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-muted hover:text-white text-xs font-mono uppercase tracking-wider transition-colors"
        >
          {showTable ? 'View chart' : 'View table'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left">
                <th className="py-2 pr-4 text-muted text-xs font-mono uppercase tracking-widest font-medium">Day</th>
                <th className="py-2 pr-4 text-muted text-xs font-mono uppercase tracking-widest font-medium">Page views</th>
                <th className="py-2 text-muted text-xs font-mono uppercase tracking-widest font-medium">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2 pr-4 text-body">{formatDay(d.day)}</td>
                  <td className="py-2 pr-4 text-white font-mono">{d.pageviews.toLocaleString()}</td>
                  <td className="py-2 text-white font-mono">{d.visitors.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
            onMouseLeave={() => setHoverIndex(null)}
            onTouchMove={(e) => e.touches[0] && updateHoverFromClientX(e.touches[0].clientX)}
            onTouchEnd={() => setHoverIndex(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={PAD.left - 8} y={yFor(t) + 4} textAnchor="end" fill="#4A4F5C" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  {t.toLocaleString()}
                </text>
              </g>
            ))}

            {daily.map((d, i) => i % labelEvery === 0 && (
              <text key={d.day} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" fill="#4A4F5C" fontSize="10" fontFamily="JetBrains Mono, monospace">
                {formatDay(d.day)}
              </text>
            ))}

            {SERIES.map((s) => (
              <path key={s.key} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {hovered && (
              <g>
                <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                {SERIES.map((s) => (
                  <circle key={s.key} cx={xFor(hoverIndex)} cy={yFor(hovered[s.key])} r="4" fill={s.color} stroke="#141414" strokeWidth="2" />
                ))}
              </g>
            )}
          </svg>

          {hovered && (
            <div
              className="absolute top-2 pointer-events-none bg-elevated border border-white/[0.1] rounded-xl px-3 py-2 shadow-card text-xs whitespace-nowrap"
              style={{
                left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                transform: hoverIndex > daily.length / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
              }}
            >
              <div className="text-muted font-mono mb-1.5">{formatDay(hovered.day)}</div>
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-2 mb-0.5 last:mb-0">
                  <span className="inline-block w-2.5 h-0.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-white font-mono font-semibold">{hovered[s.key].toLocaleString()}</span>
                  <span className="text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
