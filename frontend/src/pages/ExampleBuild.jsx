import { useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { ShopLinks } from '../components/ui/ShopLinks'

const CarViewer3D = lazy(() =>
  import('../components/ui/CarViewer3D').then(m => ({ default: m.CarViewer3D }))
)

/* ─── Hardcoded demo plan — 2018 Honda Civic Si ─── */

const DEMO = {
  year:  2018,
  make:  'Honda',
  model: 'Civic Si',
  goal:  'Fun Daily Driver',
  summary:
    "Your 2018 Civic Si is already a capable platform with the K20C1 turbo motor. With a $2,500 budget we're targeting Stage 1 mods that dramatically improve driving engagement without sacrificing reliability or daily usability. Start with tires — they transform the car immediately and cost less than most people expect. The rear motor mount kills torque steer and makes the chassis feel planted. Intake and exhaust add character. Then an ECU tune ties everything together and wakes the engine up properly.",
  total_min: 1710,
  total_max: 2950,
  hpMin: 35,
  hpMax: 55,
  mods: [
    {
      name:        'Performance Tires',
      category:    'handling',
      description: "The single highest-impact modification on any car, period. The Civic Si on factory tires leaves massive cornering, braking, and throttle response on the table. Michelin Pilot Sport 4S or Continental ExtremeContact Sport transform how the car communicates and responds. Nothing else you buy will feel as immediate.",
      price_min:   600,
      price_max:   900,
      difficulty:  'easy',
      priority:    1,
      stage:       1,
      brand_tips:  ['Michelin Pilot Sport 4S', 'Continental ExtremeContact Sport', 'Bridgestone RE-71RS'],
      warnings:    [],
    },
    {
      name:        'Rear Motor Mount',
      category:    'handling',
      description: "Stock motor mounts on the Civic Si are deliberately soft to reduce NVH for daily use. The tradeoff is significant torque steer and a vague, rubbery feel under hard acceleration. An aftermarket rear motor mount eliminates this — the car feels sharper, more planted, and more direct. Bolt-on install, no tuning required, immediate improvement.",
      price_min:   80,
      price_max:   150,
      difficulty:  'easy',
      priority:    2,
      stage:       1,
      brand_tips:  ['Hasport', 'Innovative Mounts', 'KTuner'],
      warnings:    [],
    },
    {
      name:        'Cold Air Intake',
      category:    'performance',
      description: "Improves throttle response and adds an aggressive induction sound on the K20C1 turbocharged motor. Adds 5–10 hp with a noticeable improvement in mid-range torque delivery. Pairs perfectly with the ECU tune in Stage 2 — the tuner will account for the new intake flow. Works well on its own in the meantime.",
      price_min:   180,
      price_max:   350,
      difficulty:  'easy',
      priority:    3,
      stage:       1,
      brand_tips:  ['Injen SP Series', 'AEM Short Ram', 'Skunk2'],
      warnings:    ['Verify fitment for your specific model year — some early examples need minor bracket modification.'],
    },
    {
      name:        'Cat-Back Exhaust',
      category:    'sound',
      description: "Transforms the exhaust note from the polite stock system to something that actually sounds like a performance car under load. Cat-back systems don't touch emissions equipment and require no tuning. The Civic Si platform responds especially well — expect a deeper, more aggressive note under WOT without drone at highway speeds. Quality matters here — cheap exhausts drone.",
      price_min:   450,
      price_max:   900,
      difficulty:  'medium',
      priority:    4,
      stage:       1,
      brand_tips:  ['Borla S-Type', 'Takeda Drift', 'Invidia Q300', 'Megan Racing'],
      warnings:    [],
    },
    {
      name:        'ECU Tune',
      category:    'performance',
      description: "The best horsepower-per-dollar modification on the K20C1 platform. A professional tune on 93 octane adds 20–35 hp and significantly improves torque across the entire rev range. The tune accounts for your intake and exhaust already being installed. Do this after all Stage 1 hardware is done. KTuner supports remote tuning through vetted shops nationwide.",
      price_min:   400,
      price_max:   650,
      difficulty:  'easy',
      priority:    5,
      stage:       2,
      brand_tips:  ['KTuner', 'Hondata Flashpro'],
      warnings:    ['Requires a tuning session with a qualified shop. Use 93 octane fuel after tuning.'],
    },
  ],
}

const STAGE_META = {
  1: { label: 'Stage 1', color: '#22C55E', desc: 'Foundation — highest ROI, install first' },
  2: { label: 'Stage 2', color: '#F59E0B', desc: 'Power — do after Stage 1 is complete'    },
}

const DIFF_VARIANT = { easy: 'easy', medium: 'medium', hard: 'hard' }

/* ─── Mod card ─── */
function ModCard({ mod, index, vehicle, onView3D }) {
  const stage = STAGE_META[mod.stage]
  return (
    <div
      className="animate-fade-up bg-surface rounded-2xl overflow-hidden transition-all duration-200 hover:bg-elevated"
      style={{
        animationDelay: `${index * 50}ms`,
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${stage.color}`,
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-white text-base leading-snug mb-0.5">{mod.name}</h3>
            <span className="font-mono text-xs text-muted uppercase tracking-wider capitalize">{mod.category}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={DIFF_VARIANT[mod.difficulty] || 'default'} size="sm">{mod.difficulty}</Badge>
            <Badge variant={`stage${mod.stage}`} size="sm">S{mod.stage}</Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-body text-sm leading-relaxed mb-5">{mod.description}</p>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Investment</div>
            <div className="font-mono text-white text-sm font-semibold">
              ${mod.price_min.toLocaleString()} – ${mod.price_max.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onView3D(mod)}
              className="inline-flex items-center gap-1.5 border border-white/[0.1] text-muted text-xs font-mono px-3 py-1.5 rounded-lg hover:border-accent/40 hover:text-accent transition-all duration-150"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                <path d="M6 1v10M1 3.5l5 2.5 5-2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              View 3D
            </button>
            <div className="text-right">
              <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Priority</div>
              <div className="font-display font-black text-accent text-2xl leading-none">#{mod.priority}</div>
            </div>
          </div>
        </div>

        {/* Brand tips */}
        {mod.brand_tips?.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="font-mono text-xs text-muted uppercase tracking-wider mr-2">Brands</span>
            <span className="text-sm text-body">{mod.brand_tips.join(' · ')}</span>
          </div>
        )}

        {/* Warnings */}
        {mod.warnings?.length > 0 && (
          <div className="mt-3 space-y-2">
            {mod.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-amber-400 flex-shrink-0 mt-0.5">
                  <path d="M7 1.5l6 10.5H1L7 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                  <path d="M7 6v3M7 10v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                </svg>
                <span className="text-amber-400 text-sm leading-snug">{w}</span>
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
function StageTimeline({ mods }) {
  const stageMods = { 1: [], 2: [] }
  mods.forEach(m => { if (stageMods[m.stage]) stageMods[m.stage].push(m.name) })
  const stages = [1, 2].filter(n => stageMods[n].length > 0)

  return (
    <div className="flex items-start gap-0">
      {stages.map((num, i) => {
        const meta  = STAGE_META[num]
        const count = stageMods[num].length
        return (
          <div key={num} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-display font-black text-base flex-shrink-0"
                style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}14` }}
              >
                {num}
              </div>
              <div className="text-center">
                <div className="font-display font-semibold text-white text-sm">{meta.label}</div>
                <div className="font-mono text-xs text-muted">{count} upgrade{count !== 1 ? 's' : ''}</div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex-1 h-px mx-4 mb-7" style={{ background: 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main page ─── */
export default function ExampleBuild() {
  const [viewing3D, setViewing3D] = useState(null)

  const stageMods = { 1: [], 2: [] }
  DEMO.mods.forEach(m => { if (stageMods[m.stage]) stageMods[m.stage].push(m) })

  const vehicle = { year: DEMO.year, make: DEMO.make, model: DEMO.model }

  return (
    <div className="page-shell">
      {viewing3D && (
        <Suspense fallback={null}>
          <CarViewer3D
            mod={viewing3D}
            vehicle={vehicle}
            onClose={() => setViewing3D(null)}
          />
        </Suspense>
      )}
      <div className="container-content pt-10 pb-20">

        {/* ── Header breadcrumb ── */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted text-sm font-mono uppercase tracking-wider hover:text-body transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>
          <div className="h-3 w-px bg-white/10" />
          {/* Demo badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-semibold uppercase tracking-widest px-3 py-1.5 rounded-lg">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M5 3v2.5L6.5 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
            Example Build — Demo Data
          </div>
        </div>

        {/* ── Vehicle hero ── */}
        <div
          className="relative overflow-hidden rounded-3xl mb-8"
          style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.07) 0%, rgba(19,21,25,1) 50%)' }}
        >
          <div className="absolute inset-0 grid-texture opacity-25 pointer-events-none" />
          <div
            className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(255,140,0,0.05) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 px-8 py-10 md:px-12">
            <p className="eyebrow mb-3">Example Build</p>
            <h1
              className="font-display font-black text-white leading-[0.92] tracking-tight mb-2"
              style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}
            >
              {DEMO.year} {DEMO.make}
              <br />
              <span className="text-accent">{DEMO.model}</span>
            </h1>
            <p className="text-body text-lg mt-3 mb-8">{DEMO.goal}</p>

            {/* Metrics strip */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div>
                <div className="font-display font-black text-accent leading-none mb-1" style={{ fontSize: '1.8rem' }}>
                  +{DEMO.hpMin}–{DEMO.hpMax} HP
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Est. Performance Gain</div>
              </div>
              <div>
                <div className="font-display font-black text-white leading-none mb-1" style={{ fontSize: '1.8rem' }}>
                  $2,500
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Budget</div>
              </div>
              <div>
                <div className="font-display font-black text-white leading-none mb-1" style={{ fontSize: '1.8rem' }}>
                  {DEMO.mods.length}
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Planned Upgrades</div>
              </div>
              <div>
                <div className="font-display font-black text-white leading-none mb-1" style={{ fontSize: '1.8rem' }}>
                  2 of 3
                </div>
                <div className="font-mono text-xs text-muted uppercase tracking-wider">Stages Active</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stage timeline + AI summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="md:col-span-2 bg-surface border border-white/[0.07] rounded-2xl p-6">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-6">Build Timeline</p>
            <StageTimeline mods={DEMO.mods} />
          </div>

          <div className="bg-surface border border-white/[0.07] rounded-2xl p-6">
            <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Investment Range</p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-body text-sm">Minimum</span>
                  <span className="font-mono font-semibold text-white">${DEMO.total_min.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-stage-1 rounded-full" style={{ width: `${(DEMO.total_min / DEMO.total_max) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-body text-sm">Maximum</span>
                  <span className="font-mono font-semibold text-white">${DEMO.total_max.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Advisor summary ── */}
        <div className="bg-surface border border-white/[0.07] rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent/[0.1] border border-accent/25 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="8" cy="8" r="2" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div className="font-display font-semibold text-white text-base">Performance Advisor</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-stage-1" />
                <span className="font-mono text-xs text-muted">Analysis complete</span>
              </div>
            </div>
          </div>
          <p className="text-body text-base leading-relaxed">{DEMO.summary}</p>
        </div>

        {/* ── Stage 1 mods ── */}
        <section className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-stage-1 flex-shrink-0" />
              <h2 className="font-display font-bold text-xl text-stage-1">Stage 1</h2>
            </div>
            <span className="text-body text-sm">{STAGE_META[1].desc}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span className="font-mono text-xs text-muted">{stageMods[1].length} upgrades</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stageMods[1].map((mod, i) => (
              <ModCard key={mod.name} mod={mod} index={i} vehicle={vehicle} onView3D={setViewing3D} />
            ))}
          </div>
        </section>

        {/* ── Stage 2 mods ── */}
        {stageMods[2].length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-stage-2 flex-shrink-0" />
                <h2 className="font-display font-bold text-xl text-stage-2">Stage 2</h2>
              </div>
              <span className="text-body text-sm">{STAGE_META[2].desc}</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <span className="font-mono text-xs text-muted">{stageMods[2].length} upgrade{stageMods[2].length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stageMods[2].map((mod, i) => (
                <ModCard key={mod.name} mod={mod} index={i} vehicle={vehicle} onView3D={setViewing3D} />
              ))}
            </div>
          </section>
        )}

        {/* ── CTA block ── */}
        <div
          className="relative overflow-hidden rounded-3xl text-center px-8 py-16"
          style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.08) 0%, rgba(19,21,25,1) 60%)' }}
        >
          <div className="absolute inset-0 grid-texture opacity-20 pointer-events-none" />
          <div className="relative z-10">
            <p className="eyebrow mb-4">Ready to build?</p>
            <h2
              className="font-display font-black text-white leading-tight tracking-tight mb-4"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Get your own personalized
              <br />
              <span className="text-accent">build plan in 60 seconds.</span>
            </h2>
            <p className="text-body text-lg max-w-lg mx-auto mb-10">
              CarMods AI creates a custom mod roadmap for your specific car, budget, and goals —
              not a generic list. Real parts. Real costs. Real order.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-lg px-10 py-4 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow"
              >
                Start My Build
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                to="/advisor"
                className="inline-flex items-center gap-2 border border-white/[0.15] text-white font-display font-semibold text-lg px-10 py-4 rounded-xl hover:border-white/[0.3] hover:bg-white/[0.05] transition-all duration-150"
              >
                Ask the Advisor
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
