import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBuildPlan, useBuildStatus } from '../hooks/useBuilds'
import { buildsApi } from '../services/api'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ShopLinks } from '../components/ui/ShopLinks'

const CarViewer3D = lazy(() =>
  import('../components/ui/CarViewer3D').then(m => ({ default: m.CarViewer3D }))
)
const DIFF_VARIANT  = { easy: 'easy',   medium: 'medium', hard: 'hard'   }
const STAGE_VARIANT = { 1: 'stage1',    2: 'stage2',      3: 'stage3'    }

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

/* ─── Mod card ─── */
function ModCard({ mod, index, vehicle, onView3D }) {
  const stage = STAGE_META[mod.stage] || STAGE_META[1]
  return (
    <div
      className="animate-fade-up bg-surface rounded-2xl overflow-hidden transition-all duration-200 hover:bg-elevated"
      style={{
        animationDelay: `${index * 40}ms`,
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${stage.color}`,
      }}
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
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="font-mono text-xs text-muted uppercase tracking-wider mr-2">Brands</span>
            <span className="text-xs text-body">{mod.brand_tips.join(' · ')}</span>
          </div>
        )}

        {mod.warnings?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {mod.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-500/[0.07] border border-amber-500/20 rounded-lg px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                  <path d="M6.5 1.5l5.5 9.5H1L6.5 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                  <path d="M6.5 5.5v2.5M6.5 9.5v.3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </svg>
                <span className="text-amber-400 text-xs leading-snug">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shop links */}
        <ShopLinks modName={mod.name} vehicle={vehicle} />
      </div>
    </div>
  )
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
              <div className="flex-1 h-px mx-3 mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
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
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border border-accent/30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 rounded-full border border-accent/20 animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="font-display font-black text-white text-xl mb-2 tracking-tight">Building your plan</h2>
        {vehicleLabel && <p className="font-mono text-xs text-muted uppercase tracking-widest mb-5">{vehicleLabel}</p>}
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
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-accent-bright transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {retrying && <span className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />}
          Try Again
        </button>
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

        {/* ── Vehicle Hero ── */}
        <div className="relative overflow-hidden rounded-3xl mb-8"
          style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.06) 0%, rgba(19,21,25,1) 50%)' }}>

          {/* Background pattern */}
          <div className="absolute inset-0 grid-texture opacity-30 pointer-events-none" />
          <div className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(255,140,0,0.05) 0%, transparent 70%)' }} />

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
            className="relative w-full rounded-2xl overflow-hidden transition-all duration-200 group-hover:scale-[1.01]"
            style={{
              height: 200,
              background: 'linear-gradient(135deg, rgba(255,140,0,0.08) 0%, rgba(12,13,16,1) 60%)',
              border: '1px solid rgba(255,140,0,0.2)',
            }}
          >
            <div className="absolute inset-0 grid-texture opacity-20 pointer-events-none" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/[0.12] border border-accent/25 flex items-center justify-center group-hover:bg-accent/[0.2] transition-all duration-200">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-accent">
                  <path d="M12 2L22 7V17L12 22L2 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M12 2v20M2 7l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-center">
                <div className="font-display font-black text-white text-lg mb-1 group-hover:text-accent transition-colors">
                  Open Visual Configurator
                </div>
                <div className="font-mono text-xs text-muted">
                  Customize paint · tint · wheels · mods in real-time 3D
                </div>
              </div>
              <div className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-bold text-sm px-6 py-2.5 rounded-xl group-hover:bg-amber-400 transition-colors duration-150">
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
          <div className="md:col-span-2 bg-surface border border-white/[0.07] rounded-2xl p-6">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-6">Build Timeline</p>
            <StageTimeline stageMods={stageMods} />
          </div>

          {/* Quick actions */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-3">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-2">Quick Actions</p>
            <Link
              to="/advisor"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-accent/30 hover:bg-accent/[0.05] transition-all duration-150 group"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/[0.1] border border-accent/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
                  <path d="M5 7c0-1.1.9-2 2-2s2 .9 2 2-2 3-2 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                  <circle cx="7" cy="11" r=".5" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm group-hover:text-accent transition-colors">Ask the Advisor</div>
                <div className="text-muted text-xs">Get expert guidance</div>
              </div>
            </Link>
            <Link
              to="/planner"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] transition-all duration-150"
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
              <div className="flex items-start gap-2 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-4 py-3 mt-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                  <path d="M7 1.5l6 10.5H1L7 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                  <path d="M7 6v3M7 10v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </svg>
                <span className="text-amber-400 text-xs">{plan.budget_warning}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Advisor summary ── */}
        {plan.summary && (
          <div className="mb-10 bg-surface border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/[0.1] border border-accent/25 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
                  <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <div className="font-display font-semibold text-white text-sm">Performance Advisor</div>
                <div className="flex items-center gap-1.5">
                  {plan.used_mock_fallback ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="font-mono text-xs text-amber-400" title="The AI was unavailable when this build was generated, so this plan came from our quick-match engine instead.">
                        Generated with quick-match engine
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-stage-1" />
                      <span className="font-mono text-xs text-muted">AI analysis complete</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p className="text-body text-sm leading-relaxed">{plan.summary}</p>
          </div>
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
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
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
        <div className="flex justify-between items-center pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link to="/builds" className="text-body text-sm hover:text-white transition-colors">← Back to Garage</Link>
          <Link to="/advisor"
            className="inline-flex items-center gap-2 bg-surface border border-white/[0.1] text-body text-sm font-medium px-5 py-2.5 rounded-xl hover:border-white/[0.2] hover:text-white transition-all duration-150">
            Ask the Advisor
          </Link>
        </div>
      </div>
    </div>
  )
}
