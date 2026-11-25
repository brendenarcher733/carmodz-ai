import { useState } from 'react'
import { Badge } from './Badge'
import { Alert } from './Alert'
import { ShopLinks } from './ShopLinks'
import { InstallGuidePanel } from './InstallGuidePanel'
import { NearbyShopsPanel } from './NearbyShopsPanel'
import { buildsApi } from '../../services/api'

const DIFF_VARIANT  = { easy: 'easy', medium: 'medium', hard: 'hard' }
const STAGE_VARIANT = { 1: 'stage1', 2: 'stage2', 3: 'stage3' }

/**
 * A single recommended modification. Was independently re-implemented in
 * BuildDetail.jsx and ExampleBuild.jsx with small unintentional drift
 * (padding, animation timing, warning-box radius) — now one component so
 * both pages render identically and stay that way.
 */
export function ModCard({ mod, index, vehicle, buildId, onStageComplete }) {
  // Defense in depth — the backend already drops incompatible
  // recommendations before they're ever persisted or returned (see
  // services/fitment_service.py), so this should never actually fire, but
  // an incompatible mod must never be shown if one somehow slips through.
  if (mod.fitment_status === 'incompatible') return null

  const [completed,   setCompleted]   = useState(mod.completed ?? false)
  const [showPrompt,  setShowPrompt]  = useState(false)
  const [completedBy, setCompletedBy] = useState(null)
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)

  // Silent hide, not an opt-out scattered across pages: mod.id only exists
  // for a real, persisted recommendation (anonymous previews and the static
  // ExampleBuild demo never have one — see models/recommendation.py's
  // EvaluatedModRecommendation), and buildId only exists where a page
  // actually has a saved build to PATCH against. Pages that can't complete
  // mods don't need to know anything about this feature at all.
  const canComplete = mod.id && buildId

  function handleCheckClick() {
    if (completed || !canComplete) return
    setCompleted(true)   // optimistic
    setShowPrompt(true)
  }

  async function handleSave(by, n) {
    setSaving(true)
    setShowPrompt(false)
    setError(null)
    try {
      const data = await buildsApi.completeMod(buildId, mod.id, {
        completed_by: by ?? null,
        completion_note: n || null,
      })
      if (data.stage_complete && data.stage_message && onStageComplete) {
        onStageComplete(mod.stage, data.stage_message)
      }
    } catch {
      setCompleted(false)   // revert
      setError('Could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`animate-fade-up border rounded-2xl overflow-hidden transition-all duration-300 ${
        completed
          ? 'bg-surface/50 border-green-500/20 opacity-75'
          : 'bg-surface border-white/[0.07] hover:bg-elevated'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="p-5">
        {/* Header — wraps on narrow screens so a long name + three badges
            (difficulty, stage, and the conditional fitment badge below)
            never get squeezed into an unreadably thin column. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-white text-base leading-snug mb-0.5">
              {mod.name}
            </h3>
            <span className="font-mono text-xs text-muted uppercase tracking-wider capitalize">
              {mod.category}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Badge variant={DIFF_VARIANT[mod.difficulty] || 'default'} size="sm">{mod.difficulty}</Badge>
            <Badge variant={STAGE_VARIANT[mod.stage]    || 'default'} size="sm">S{mod.stage}</Badge>
            {/* At-a-glance scan signal — see the detailed note further down
                for the full explanation. Curated "verified" mods and the
                default never show this; only genuine uncertainty does. */}
            {mod.fitment_status === 'unknown' && (
              <Badge variant="warning" size="sm">Confirm Fitment</Badge>
            )}
            {canComplete && (
              <button
                onClick={handleCheckClick}
                disabled={completed || saving}
                title={completed ? 'Completed' : 'Mark as done'}
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 ${
                  completed
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : 'border-white/20 text-white/20 hover:border-green-500/50 hover:text-green-400'
                }`}
              >
                {saving ? (
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-body text-sm leading-relaxed mb-1">{mod.why}</p>
        {mod.impact && (
          <p className="text-body text-sm leading-relaxed mb-4 text-muted">{mod.impact}</p>
        )}

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
            {/* A verified part's compatibility_note is researched context
                ("pairs well with X"), not a caution — it shouldn't wear the
                same warning triangle as an unconfirmed-fitment mod. */}
            <Alert variant={mod.fitment_status === 'verified' ? 'success' : 'warning'} className="!rounded-lg !py-2">
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
              <span className="text-xs leading-snug">
                Confirm fitment before buying — not yet verified for your exact vehicle.
              </span>
            </Alert>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Alert variant="warning" className="!rounded-lg !py-2">
              <span className="text-xs leading-snug">{error}</span>
            </Alert>
          </div>
        )}

        {/* Optional completion detail prompt */}
        {showPrompt && (
          <div className="mt-4 pt-4 border-t border-white/[0.07] animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">How'd it go?</span>
              <button
                onClick={() => handleSave(null, '')}
                className="text-xs text-muted hover:text-white transition-colors"
              >
                Skip
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {['diy', 'shop'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setCompletedBy(completedBy === opt ? null : opt)}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-200 ${
                    completedBy === opt
                      ? 'bg-ai/20 border border-ai/40 text-ai'
                      : 'bg-white/[0.04] border border-white/[0.08] text-muted hover:text-white'
                  }`}
                >
                  {opt === 'diy' ? 'DIY' : 'Shop'}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any notes... (optional)"
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-body placeholder-muted resize-none focus:outline-none focus:border-ai/40 mb-3"
            />
            <button
              onClick={() => handleSave(completedBy, note)}
              className="w-full py-2 bg-ai/20 hover:bg-ai/30 border border-ai/40 rounded-lg text-xs font-mono uppercase tracking-wider text-ai transition-all duration-200"
            >
              Save
            </button>
          </div>
        )}

        {/* Shop links */}
        <ShopLinks modName={mod.name} category={mod.category} exactProduct={mod.suggested_search_terms?.[0]} vehicle={vehicle} />

        {/* On-demand install guide — generated only if expanded */}
        <InstallGuidePanel mod={mod} vehicle={vehicle} />

        {/* Local shop discovery — hands off to an external Maps search,
            nothing stored or sent to our backend (see component docstring) */}
        <NearbyShopsPanel mod={mod} />
      </div>
    </div>
  )
}
