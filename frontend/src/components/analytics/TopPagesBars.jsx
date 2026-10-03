// Same violet used for "Page views" in TrafficChart — this is the same
// metric (views), just broken down by page instead of by day, so it keeps
// the same series color rather than inventing a new one for the same entity.
const COLOR = '#9085e9'

export function TopPagesBars({ pages }) {
  if (!pages || pages.length === 0) {
    return <div className="text-muted text-sm py-12 text-center">No page-view data for this period yet.</div>
  }

  const max = Math.max(...pages.map((p) => p.views))

  return (
    <div className="space-y-3">
      {pages.map((p) => (
        <div key={p.path}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-mono text-xs text-body truncate">{p.path}</span>
            <span className="font-mono text-xs text-white font-semibold flex-shrink-0">{p.views.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max(2, (p.views / max) * 100)}%`, background: COLOR }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
