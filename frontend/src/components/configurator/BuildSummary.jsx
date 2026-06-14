import clsx from 'clsx'
import { Link } from 'react-router-dom'

export function BuildSummary({ summary, vehicleName }) {
  const { items, total } = summary

  return (
    <div className="flex flex-col h-full" style={{ background: '#0f1014', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Build Summary</p>
        {vehicleName && (
          <p className="font-display font-bold text-white text-sm truncate">{vehicleName}</p>
        )}
      </div>

      {/* Mod list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-muted text-xs font-mono">No mods selected yet.</p>
            <p className="text-muted text-[11px] mt-1">Choose options on the left.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div
                key={i}
                className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-0.5">{item.category}</div>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display font-semibold text-white text-xs leading-snug flex-1">{item.label}</div>
                  <div className="font-mono text-accent text-xs font-bold flex-shrink-0">
                    +${item.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex-shrink-0 px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] text-muted uppercase tracking-wider">Mod Total</span>
          <span className="font-display font-black text-white text-lg leading-none">
            ${total.toLocaleString()}
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted mt-1 mb-4">
          {items.length} modification{items.length !== 1 ? 's' : ''} selected
        </div>

        <Link
          to="/advisor"
          className="block w-full text-center bg-accent text-obsidian font-display font-black text-sm px-4 py-3 rounded-xl hover:bg-amber-400 transition-colors duration-150"
        >
          Get Expert Advice
        </Link>
        <Link
          to="/planner"
          className={clsx(
            'block w-full text-center mt-2 text-body text-xs font-medium px-4 py-2.5 rounded-xl border border-white/[0.08]',
            'hover:border-white/[0.18] hover:text-white transition-all duration-150',
          )}
        >
          New Build
        </Link>
      </div>
    </div>
  )
}
