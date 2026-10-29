import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ModCard } from '../components/ui/ModCard'
import * as analytics from '../services/analytics'
import { saveLocalPlan, getLocalPlan } from '../lib/savedPlan'

export default function PlanPreview() {
  const { state } = useLocation()

  // Falls back to a previously-saved local plan only when there's no
  // router state at all (a direct/refreshed visit) — see lib/savedPlan.js.
  // A plan is only ever written there by an explicit "Save this build"
  // click below, never silently, so this fallback only ever recovers a
  // plan the user actually chose to keep.
  const [recovered] = useState(() => (!state?.plan ? getLocalPlan() : null))
  const plan    = state?.plan    || recovered?.plan
  const vehicle = state?.vehicle || recovered?.vehicle

  const [saved, setSaved]           = useState(() => Boolean(recovered))
  const [shareState, setShareState] = useState('idle')   // 'idle' | 'copied' | 'error'

  // `plan`'s reference is stable across re-renders triggered by `saved`/
  // `shareState` changes (it's derived once from router state or the
  // lazy-initialized `recovered`, never recreated) — this only re-fires if
  // the actual plan changes, not on every render, so a save/share click
  // afterward can't cause a duplicate view event.
  useEffect(() => { if (plan) analytics.capture('plan_viewed') }, [plan])

  if (!plan) return <Navigate to="/planner" replace />

  const handleSave = () => {
    const success = saveLocalPlan(plan, vehicle)
    if (success) setSaved(true)
    // Fires on every click, success or not — a failed save (e.g. private
    // browsing blocking localStorage) is still a meaningful funnel signal,
    // not something to hide by only tracking the happy path.
    analytics.capture('build_save_clicked', { success })
  }

  const handleShare = async () => {
    const topMods = plan.mods.slice(0, 3).map(m => m.name).join(', ')
    const text = `My ${vehicle?.year} ${vehicle?.make} ${vehicle?.model} mod plan from CarMods AI: ${topMods}. `
      + `Estimated $${plan.total_min.toLocaleString()}–$${plan.total_max.toLocaleString()}.`
    const url = window.location.origin   // the site itself, not this page — a refreshed/shared
                                           // /plan/preview can't reload someone else's plan (no ID,
                                           // no account behind it), so this invites them to build
                                           // their own rather than overclaiming a shareable link.

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My CarMods AI build plan', text, url })
        analytics.capture('build_shared', { method: 'web_share' })
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShareState('copied')
      analytics.capture('build_shared', { method: 'clipboard' })
    } catch {
      setShareState('error')
    } finally {
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  return (
    <div className="page-shell relative">

      {/* ── Hero — self-contained around just the heading block. Deliberately
           NOT nested inside anything with transform/opacity/.reveal — that
           silently breaks mix-blend-mode by trapping it in its own stacking
           context (found and fixed on Landing.jsx's features-grid accent;
           same trap avoided here from the start). The orange-tinted gradient
           on the outer div is always visible on its own — if build-hero.jpg
           is ever missing, that's the fallback, not a broken image or flat
           black page. The photo itself is capped to roughly the right half
           and masked so it never sits under the heading text. */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,107,0,0.08) 0%, rgba(10,10,10,0.55) 50%, rgba(10,10,10,0.9) 100%)',
        }}
      >
        <div
          className="hidden md:block absolute inset-y-0 right-0 pointer-events-none"
          style={{
            width: 'min(52%, 640px)',
            backgroundImage: 'url(/images/build-hero.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 48%',
            mixBlendMode: 'screen',
            opacity: 0.5,
            WebkitMaskImage: 'radial-gradient(circle at 78% 55%, black 0%, black 35%, transparent 75%)',
            maskImage: 'radial-gradient(circle at 78% 55%, black 0%, black 35%, transparent 75%)',
          }}
        />

        {/* Dark radial overlay — strongest over the text (left), fading out
            toward the photo (right), so the heading stays legible regardless
            of what's under it. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 100% at 0% 50%, rgba(9,9,9,0.95) 0%, rgba(9,9,9,0.5) 55%, transparent 85%)',
          }}
        />

        <div className="container-content relative z-10 py-8 md:py-12">
          <p className="eyebrow mb-2">Your plan</p>
          <h1
            className="font-display font-black text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)' }}
          >
            {vehicle?.year} {vehicle?.make} {vehicle?.model}
          </h1>
          <p className="text-body mt-3 max-w-2xl">{plan.summary}</p>
        </div>
      </div>

      <div className="container-content pb-6 md:pb-12 relative z-10">

        <Card padding="lg" className="mb-8 mt-8 flex flex-wrap gap-8">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Estimated total</div>
            <div className="font-display font-black text-white text-2xl">
              ${plan.total_min.toLocaleString()} – ${plan.total_max.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Budget</div>
            <div className="font-display font-black text-white text-2xl">${plan.budget.toLocaleString()}</div>
          </div>
        </Card>

        {plan.budget_warning && (
          <p className="text-body text-sm mb-6">{plan.budget_warning}</p>
        )}

        <div className="space-y-4 mb-10">
          {plan.mods.map((mod, i) => (
            <ModCard key={`${mod.name}-${i}`} mod={mod} index={i} vehicle={vehicle} />
          ))}
        </div>

        <Card padding="lg" className="text-center">
          <p className="text-body text-sm mb-5">
            {saved
              ? 'Saved on this device — it’ll be here next time you visit from this browser.'
              : 'This plan lives on this page only — save it so refreshing or leaving doesn’t lose it.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <Button onClick={handleSave} disabled={saved} variant="primary" size="lg">
              {saved ? 'Saved ✓' : 'Save this build'}
            </Button>
            <Button onClick={handleShare} variant="secondary" size="lg">
              {shareState === 'copied' ? 'Copied!' : shareState === 'error' ? "Couldn't copy" : 'Share this build'}
            </Button>
          </div>

          <Link
            to="/planner"
            onClick={() => analytics.capture('build_another_clicked')}
            className="inline-flex items-center gap-1.5 text-body text-sm font-medium hover:text-white transition-colors"
          >
            Build another car
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 9L9 3M5 3h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </Card>
      </div>
    </div>
  )
}
