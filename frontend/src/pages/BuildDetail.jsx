import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBuildPlan, useBuildStatus } from '../hooks/useBuilds'
import { buildsApi } from '../services/api'
import { Spinner } from '../components/ui/Spinner'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { ModCard } from '../components/ui/ModCard'
import { VehicleSilhouette } from '../components/ui/VehicleSilhouette'
import { IconWrench, IconCheckeredFlag, IconCompassGauge, IconGauge } from '../components/icons/AutoIcons'

const CarViewer3D = lazy(() =>
  import('../components/ui/CarViewer3D').then(m => ({ default: m.CarViewer3D }))
)

const STAGE_META = {
  1: { label: 'Stage 1', color: '#22C55E', desc: 'Foundation — best return on investment'  },
  2: { label: 'Stage 2', color: '#F59E0B', desc: 'Power — bigger gains after Stage 1'       },
  3: { label: 'Stage 3', color: '#EF4444', desc: 'Advanced — peak performance, max effort'  },
}

/* ─── Estimate total HP gain from performance mods ─── */
function estimateGains(mods) {
  let min = 0, max = 0
  mods.filter(m => m.category === 'performance').forEach(mod => {
    const txt = (mod.name + ' ' + mod.description).toLowerCase()
    if (txt.includes('tune') || txt.includes('ecu') || txt.includes('remap'))          { min += 20; max += 55 }
    else if (txt.includes('turbo') || txt.includes('supercharg'))                       { min += 50; max += 150 }
    else if (txt.includes('intercooler'))                                                { min += 15; max += 40 }
    else if (txt.includes('downpipe') || txt.includes('uppipe') || txt.includes('up-pipe')) { min += 10; max += 30 }
    else if (txt.includes('intake'))                                                     { min += 5;  max += 20 }
    else if (txt.includes('exhaust'))                                                    { min += 5;  max += 20 }
    else                                                                                 { min += 5;  max += 15 }
  })
  return { min, max }
}

/* ─── Stage timeline ─── */
function StageTimeline({ stageMods }) {
  const stages = [1, 2, 3].filter(n => stageMods[n]?.length > 0)
  return (
    <div className="flex items-start gap-0">
      {stages.map((num, i) => {
        const meta  = STAGE_META[num]
        const count = stageMods[num].length
        return (
          <div key={num} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
              {/* Node */}
              <div
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-display font-black text-sm flex-shrink-0"
                style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}14` }}
              >
                {num}
              </div>
              <div className="text-center">
                <div className="font-display font-bold text-white text-sm">{meta.label}</div>
                <div className="font-mono text-xs text-muted">{count} upgrade{count !== 1 ? 's' : ''}</div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex-1 h-px mx-3 mb-6 bg-white/[0.07]" />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Generating state — recommendation job is still pending/running ─── */
const GENERATING_MSGS = [
  'Analyzing your platform…',
  'Sourcing real aftermarket parts…',
  'Checking platform compatibility…',
  'Calculating budget allocation…',
  'Ranking upgrades by impact-per-dollar…',
  'Mapping your stage roadmap…',
]

function GeneratingState({ vehicleLabel }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % GENERATING_MSGS.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="page-shell flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center max-w-sm px-8">
        <div className="relative w-16 h-16 mx-auto mb-8">
          <Spinner variant="ai" size="lg" className="absolute inset-0 w-16 h-16" />
          <div className="absolute inset-0 flex items-center justify-center">
            <IconCheckeredFlag width={22} height={22} strokeWidth={1.5} className="text-ai" />
          </div>
        </div>
        <h2 className="font-display font-black text-white text-xl mb-2 tracking-tight">Building your plan</h2>
        {vehicleLabel && <p className="text-xs text-muted uppercase tracking-widest mb-5">{vehicleLabel}</p>}
        <p key={idx} className="text-body text-sm leading-relaxed animate-fade-in">{GENERATING_MSGS[idx]}</p>
        <p className="font-mono text-xs text-muted mt-6">This usually takes 20-45 seconds.</p>
      </div>
    </div>
  )
}

/* ─── Failed state — generation exhausted retries with no usable result ─── */
function FailedState({ errorMessage, onRetry, retrying }) {
  return (
    <div className="page-shell flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center max-w-md px-8">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-red-400">
            <path d="M11 2l9 17H2L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M11 8.5v5M11 16.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="font-display font-black text-white text-xl mb-2 tracking-tight">Plan generation failed</h2>
        <p className="text-body text-sm mb-6">{errorMessage || 'Something went wrong generating your recommendations.'}</p>
        <Button onClick={onRetry} loading={retrying} size="lg">
          Try Again
        </Button>
        <div className="mt-5">
          <Link to="/builds" className="text-muted text-sm hover:text-body transition-colors">← Back to Garage</Link>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function BuildDetail() {
  const { id } = useParams()
  const { status, retry } = useBuildStatus(id)
  const [retrying, setRetrying] = useState(false)
  const [build, setBuild] = useState(null)
  const [viewing3D, setViewing3D] = useState(null)

  // Fetched once for vehicle context during the generating state —
  // useBuildStatus intentionally only returns the lightweight status shape,
  // not the full build, to keep poll payloads small.
  useEffect(() => {
    if (!id) return
    buildsApi.get(id).then(setBuild).catch(() => {})
  }, [id])

  const isReady = status?.status === 'ready'
  const { plan, loading, error } = useBuildPlan(id, { enabled: isReady })

  const handleRetry = async () => {
    setRetrying(true)
    await retry()
    setRetrying(false)
  }

  if (!status || status.status === 'pending' || status.status === 'generating') {
    return <GeneratingState vehicleLabel={build ? `${build.year} ${build.make} ${build.model}` : ''} />
  }

  if (status.status === 'failed') {
    return <FailedState errorMessage={status.error_message} onRetry={handleRetry} retrying={retrying} />
  }

  if (loading) return (
    <div className="page-shell flex items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-body text-sm">Loading your build…</p>
    </div>
  )

  if (error) return (
    <div className="page-shell flex items-center justify-center">
      <div className="text-center max-w-sm">
        <p className="font-display font-semibold text-white text-lg mb-2">Build not found</p>
        <p className="text-body text-sm mb-6">{error}</p>
        <Link to="/builds" className="text-accent text-sm hover:underline">← Back to Garage</Link>
      </div>
    </div>
  )

  if (!plan) return null

  const stageMods = { 1: [], 2: [], 3: [] }
  plan.mods.forEach(m => { if (stageMods[m.stage]) stageMods[m.stage].push(m) })
  const { min: hpMin, max: hpMax } = estimateGains(plan.mods)
  const stagesUsed = [1, 2, 3].filter(n => stageMods[n].length > 0)

  const vehicle = { year: plan.year, make: plan.make, model: plan.model }

  return (
    <div className="page-shell">
      {/* ── 3D Viewer modal ── */}
      {viewing3D && (
        <Suspense fallback={null}>
          <CarViewer3D
            mod={viewing3D}
            vehicle={vehicle}
            onClose={() => setViewing3D(null)}
          />
        </Suspense>
      )}
      <div className="container-content pt-10 pb-16">

        {/* ── Vehicle Hero — this panel is what gets screenshotted and
             shared, so it gets the full treatment: the vehicle silhouette
             (real body-style match via classifyVehicle), the blueprint-grid
             texture, and technical-drawing corner brackets. ── */}
        <div className="dyno-frame relative overflow-hidden rounded-3xl mb-8"
          style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.06) 0%, rgba(19,21,25,1) 50%)' }}>

          {/* Grid texture as its own layer — the parent already carries an
              inline `background` gradient, and an inline style always beats
              a class's background-image, so .bg-blueprint-grid can't live
              on that same element. */}
          <div className="absolute inset-0 bg-blueprint-grid pointer-events-none opacity-70" />

          <div className="dyno-frame-corner" />
          <div className="dyno-frame-corner dyno-frame-corner--br" />

          <div className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(255,107,0,0.09) 0%, transparent 70%)' }}>
            <VehicleSilhouette
              make={plan.make} model={plan.model} year={plan.year}
              tone="feature"
              className="absolute inset-0 w-full h-full text-accent/[0.35]"
            />
          </div>

          <div className="relative z-10 px-8 py-10">
            {/* Breadcrumb */}
            <Link to="/builds" className="inline-flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wider hover:text-body transition-colors mb-6">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              My Garage
            </Link>

            {/* Vehicle name — the hero */}
            <div className="mb-6">
              <p className="eyebrow mb-2">Your Build</p>
              <h1
                className="font-display font-black text-white leading-[0.92] tracking-tight"
                style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}
              >
                {plan.year} {plan.make}
                <br />
                <span className="text-accent">{plan.model}</span>
              </h1>
              <p className="text-body text-base mt-3 capitalize">{plan.goal}</p>
            </div>

            {/* Performance metrics strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/[0.07]">
              {hpMin > 0 && (
                <div>
                  <div className="font-display font-black text-accent leading-none mb-1"
                    style={{ fontSize: '1.75rem' }}>
                    +{hpMin}–{hpMax} HP
                  </div>
                  <div className="font-mono text-xs text-muted uppercase tracking-wider">Est. Performance Gain</div>
                </div>
              )}
              <div>
                <div className="font-display font-black text-white leading-none mb-1"
                  style={{ fontSize: '1.75rem' }}>
                  ${plan.total_min.toLocaleString()}–${plan.total_max.toLocaleString()}
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Build Investment</div>
              </div>
              <div>
                <div className="font-display font-black text-white leading-none mb-1"
                  style={{ fontSize: '1.75rem' }}>
                  {plan.mods.length}
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Planned Upgrades</div>
              </div>
              <div>
                <div className="font-display font-black text-white leading-none mb-1"
                  style={{ fontSize: '1.75rem' }}>
                  {stagesUsed.length} of 3
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Stages Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Visual Configurator launch ── */}
        <Link
          to={`/configurator?make=${encodeURIComponent(plan.make)}&model=${encodeURIComponent(plan.model)}&year=${plan.year}`}
          className="block mb-8 group"
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.01]"
            style={{
              height: 200,
              background: 'linear-gradient(135deg, rgba(255,107,0,0.08) 0%, rgba(12,13,16,1) 60%)',
              border: '1px solid rgba(255,107,0,0.2)',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/[0.12] border border-accent/25 flex items-center justify-center group-hover:bg-accent/[0.2] transition-all duration-300">
                <IconWrench width={24} height={24} strokeWidth={1.4} className="text-accent" />
              </div>
              <div className="text-center">
                <div className="font-display font-black text-white text-lg mb-1 group-hover:text-accent transition-colors">
                  Open Visual Configurator
                </div>
                <div className="font-mono text-xs text-muted">
                  Customize paint · tint · wheels · mods in real-time 3D
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-bold text-sm px-6 py-2.5 rounded-xl group-hover:bg-accent-bright transition-colors duration-200">
                Launch Configurator
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Stage timeline + actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* Timeline */}
          <Card padding="lg" className="md:col-span-2">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-6">Build Timeline</p>
            <StageTimeline stageMods={stageMods} />
          </Card>

          {/* Quick actions */}
          <Card padding="lg" className="flex flex-col gap-3">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Quick Actions</p>
            <Link
              to="/advisor"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-ai/30 hover:bg-ai/[0.05] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-lg bg-ai/[0.1] border border-ai/20 flex items-center justify-center flex-shrink-0">
                <IconCompassGauge width={14} height={14} strokeWidth={1.25} className="text-ai" />
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm group-hover:text-ai transition-colors">Ask the Advisor</div>
                <div className="text-muted text-xs">Get expert guidance</div>
              </div>
            </Link>
            <Link
              to="/planner"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-body">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm">New Build</div>
                <div className="text-muted text-xs">Plan another vehicle</div>
              </div>
            </Link>
            {plan.budget_warning && (
              <Alert variant="warning" className="mt-1">
                <span className="text-xs">{plan.budget_warning}</span>
              </Alert>
            )}
          </Card>
        </div>

        {/* ── AI Advisor summary ── */}
        {plan.summary && (
          <Card padding="lg" className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ai/[0.1] border border-ai/25 flex items-center justify-center flex-shrink-0">
                <IconGauge width={14} height={14} strokeWidth={1.25} className="text-ai" />
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm">Performance Advisor</div>
                <div className="flex items-center gap-1.5">
                  {plan.used_mock_fallback ? (
                    <>
                      {/* Amber, deliberately not cyan — this specifically means
                          the AI was NOT used (fallback engine instead), so
                          tinting it with the AI color would be misleading. */}
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-mono text-xs text-amber-400" title="The AI was unavailable when this build was generated, so this plan came from our quick-match engine instead.">
                        Generated with quick-match engine
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse-dot" />
                      <span className="font-mono text-xs text-ai">AI analysis complete</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p className="text-body text-sm leading-relaxed">{plan.summary}</p>
          </Card>
        )}

        {/* ── Upgrades by stage ── */}
        {[1, 2, 3].map(stageNum => {
          const mods = stageMods[stageNum]
          if (!mods.length) return null
          const meta = STAGE_META[stageNum]
          return (
            <section key={stageNum} className="mb-12">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <h2 className="font-display font-bold text-lg" style={{ color: meta.color }}>{meta.label}</h2>
                </div>
                <span className="text-body text-sm">{meta.desc}</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="font-mono text-xs text-muted">{mods.length} upgrade{mods.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mods.map((mod, i) => (
                  <ModCard key={mod.name} mod={mod} index={i} vehicle={vehicle} onView3D={setViewing3D} />
                ))}
              </div>
            </section>
          )
        })}

        {/* ── Bottom ── */}
        <div className="flex justify-between items-center pt-8 border-t border-white/[0.05]">
          <Link to="/builds" className="text-body text-sm hover:text-white transition-colors">← Back to Garage</Link>
          <Button to="/advisor" variant="outline" size="md">Ask the Advisor</Button>
        </div>
      </div>
    </div>
  )
}
