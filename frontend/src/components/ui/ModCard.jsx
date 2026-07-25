import { Badge } from './Badge'
import { Alert } from './Alert'
import { ShopLinks } from './ShopLinks'

const DIFF_VARIANT  = { easy: 'easy', medium: 'medium', hard: 'hard' }
const STAGE_VARIANT = { 1: 'stage1', 2: 'stage2', 3: 'stage3' }

/**
 * A single recommended modification. Was independently re-implemented in
 * BuildDetail.jsx and ExampleBuild.jsx with small unintentional drift
 * (padding, animation timing, warning-box radius) — now one component so
 * both pages render identically and stay that way.
 */
export function ModCard({ mod, index, vehicle, onView3D }) {
  return (
    <div
      className="animate-fade-up bg-surface border border-white/[0.07] rounded-2xl overflow-hidden transition-all duration-200 hover:bg-elevated"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display font-semibold text-white text-base leading-snug mb-0.5">{mod.name}</h3>
            <span className="font-mono text-xs text-muted uppercase tracking-wider capitalize">{mod.category}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={DIFF_VARIANT[mod.difficulty] || 'default'} size="sm">{mod.difficulty}</Badge>
            <Badge variant={STAGE_VARIANT[mod.stage] || 'default'}     size="sm">S{mod.stage}</Badge>
          </div>
        </div>

        <p className="text-body text-sm leading-relaxed mb-4">{mod.description}</p>

        {/* Investment + priority + 3D button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Investment</div>
            <div className="font-mono text-white text-sm font-semibold">
              ${mod.price_min.toLocaleString()} – ${mod.price_max.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View in 3D */}
            <button
              type="button"
              onClick={() => onView3D(mod)}
              className="inline-flex items-center gap-1.5 border border-white/[0.1] text-muted text-xs font-mono px-3 py-1.5 rounded-lg hover:border-accent/40 hover:text-accent transition-all duration-150"
              title="View this mod on the car in 3D"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                <path d="M6 1v10M1 3.5l5 2.5 5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              View 3D
            </button>
            <div className="text-right">
              <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Priority</div>
              <div className="font-display font-black text-accent text-xl leading-none">#{mod.priority}</div>
            </div>
          </div>
        </div>

        {mod.brand_tips?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <span className="font-mono text-xs text-muted uppercase tracking-wider mr-2">Brands</span>
            <span className="text-xs text-body">{mod.brand_tips.join(' · ')}</span>
          </div>
        )}

        {mod.warnings?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {mod.warnings.map((w, i) => (
              <Alert key={i} variant="warning" className="!rounded-lg !py-2">
                <span className="text-xs leading-snug">{w}</span>
              </Alert>
            ))}
          </div>
        )}

        {/* Shop links */}
        <ShopLinks modName={mod.name} vehicle={vehicle} />
      </div>
    </div>
  )
}
