import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { ModCard } from '../components/ui/ModCard'
import * as analytics from '../services/analytics'

export default function PlanPreview() {
  const { state } = useLocation()
  const plan = state?.plan
  const vehicle = state?.vehicle

  useEffect(() => { if (plan) analytics.capture('plan_preview_viewed') }, [plan])

  if (!plan) return <Navigate to="/planner" replace />

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
          <p className="text-body text-sm mb-4">
            This plan isn't saved — it lives on this page only. Refreshing or leaving starts you over.
          </p>
          <Link
            to="/planner"
            className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-base px-7 py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-200"
          >
            Plan another build
          </Link>
        </Card>
      </div>
    </div>
  )
}
