import { Badge } from './Badge'
import { Alert } from './Alert'
import { ShopLinks } from './ShopLinks'
import { InstallGuidePanel } from './InstallGuidePanel'
import { NearbyShopsPanel } from './NearbyShopsPanel'

const DIFF_VARIANT  = { easy: 'easy', medium: 'medium', hard: 'hard' }
const STAGE_VARIANT = { 1: 'stage1', 2: 'stage2', 3: 'stage3' }

/**
 * A single recommended modification. Was independently re-implemented in
 * BuildDetail.jsx and ExampleBuild.jsx with small unintentional drift
 * (padding, animation timing, warning-box radius) — now one component so
 * both pages render identically and stay that way.
 */
export function ModCard({ mod, index, vehicle }) {
  // Defense in depth — the backend already drops incompatible
  // recommendations before they're ever persisted or returned (see
  // services/fitment_service.py), so this should never actually fire, but
  // an incompatible mod must never be shown if one somehow slips through.
  if (mod.fitment_status === 'incompatible') return null

  return (
    <div
      className="animate-fade-up bg-surface border border-white/[0.07] rounded-2xl overflow-hidden transition-all duration-300 hover:bg-elevated"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="p-5">
        {/* Header — wraps on narrow screens so a long name + three badges
            (difficulty, stage, and the conditional fitment badge below)
            never get squeezed into an unreadably thin column. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-white text-base leading-snug mb-0.5">{mod.name}</h3>
            <span className="font-mono text-xs text-muted uppercase tracking-wider capitalize">{mod.category}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Badge variant={DIFF_VARIANT[mod.difficulty] || 'default'} size="sm">{mod.difficulty}</Badge>
            <Badge variant={STAGE_VARIANT[mod.stage] || 'default'}     size="sm">S{mod.stage}</Badge>
            {/* At-a-glance scan signal — see the detailed note further down
                for the full explanation. Curated "verified" mods and the
                default never show this; only genuine uncertainty does. */}
            {mod.fitment_status === 'unknown' && (
              <Badge variant="warning" size="sm">Confirm Fitment</Badge>
            )}
          </div>
        </div>

        <p className="text-body text-sm leading-relaxed mb-1">{mod.why}</p>
        {mod.impact && <p className="text-body text-sm leading-relaxed mb-4 text-muted">{mod.impact}</p>}

        {/* Investment + priority */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Investment</div>
            <div className="font-mono text-white text-sm font-semibold">
              ${mod.price_min.toLocaleString()} – ${mod.price_max.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Priority</div>
            {/* AI-assigned rank on this recommendation. */}
            <div className="font-display font-black text-ai text-xl leading-none">#{mod.priority}</div>
          </div>
        </div>

        {mod.tradeoff && (
          <div className="mt-3 pt-3 border-t border-white/[0.05]">
            <span className="font-mono text-xs text-muted uppercase tracking-wider mr-2">Tradeoff</span>
            <span className="text-xs text-body">{mod.tradeoff}</span>
          </div>
        )}

        {mod.compatibility_note && (
          <div className="mt-3 space-y-1.5">
            <Alert variant="warning" className="!rounded-lg !py-2">
              <span className="text-xs leading-snug">{mod.compatibility_note}</span>
            </Alert>
          </div>
        )}

        {/* Fitment hasn't been confirmed against this specific vehicle —
            "verified" (curated) and the unset default both render nothing
            extra here. The badge above is the at-a-glance signal; this adds
            the one extra sentence of context for someone reading this card. */}
        {mod.fitment_status === 'unknown' && (
          <div className="mt-3">
            <Alert variant="warning" className="!rounded-lg !py-2">
              <span className="text-xs leading-snug">Confirm fitment before buying — not yet verified for your exact vehicle.</span>
            </Alert>
          </div>
        )}

        {/* Shop links */}
        <ShopLinks modName={mod.name} exactProduct={mod.suggested_search_terms?.[0]} vehicle={vehicle} />

        {/* On-demand install guide — generated only if expanded */}
        <InstallGuidePanel mod={mod} vehicle={vehicle} />

        {/* Local shop discovery — hands off to an external Maps search,
            nothing stored or sent to our backend (see component docstring) */}
        <NearbyShopsPanel mod={mod} />
      </div>
    </div>
  )
}
