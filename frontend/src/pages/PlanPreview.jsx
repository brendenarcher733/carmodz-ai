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
      <div className="container-content py-6 md:py-12 relative z-10">

        <div className="mb-8">
          <p className="eyebrow mb-2">Your plan</p>
          <h1
            className="font-display font-black text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)' }}
          >
            {vehicle?.year} {vehicle?.make} {vehicle?.model}
          </h1>
          <p className="text-body mt-3 max-w-2xl">{plan.summary}</p>
        </div>

        <Card padding="lg" className="mb-8 flex flex-wrap gap-8">
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
