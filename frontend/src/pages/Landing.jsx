import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* ─── Scroll-reveal hook ─── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible') },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

/* ─── Data ─── */
const FEATURES = [
  { num: '01', title: 'Your Digital Garage',     desc: 'Every build lives in your personal garage. Track progress, budget, and upgrades across multiple vehicles — all in one place.' },
  { num: '02', title: 'Platform Intelligence',   desc: 'Recommendations built around your exact platform. A WRX build is not a GTI build. We know the difference.' },
  { num: '03', title: 'Staged Build Roadmap',    desc: 'Stage 1 → 2 → 3. Start with the highest-impact, most affordable mods first. Scale up when you\'re ready.' },
  { num: '04', title: 'Honest Trade-offs',       desc: "We tell you when a mod isn't worth the money, needs other mods done first, or is better left to a professional." },
  { num: '05', title: 'Performance Advisor',     desc: 'Ask anything — mod order, brand picks, budget breakdowns, compatibility. An expert tuner in your pocket.' },
  { num: '06', title: 'Real Investment Numbers', desc: 'Actual price ranges, not guesses. See exactly what your build costs before you spend a dollar.' },
]

const EXAMPLE = {
  vehicle: '2018 Honda Civic Si', goal: 'Fun Daily Driver',
  budget: '$2,500', hpGain: '+35–55 HP', stage: 'Stage 1 of 2',
  mods: [
    { rank: 1, name: 'Performance Tires',  cost: '$600–$900',  diff: 'Easy',   diffCls: 'text-stage-1', stage: 1 },
    { rank: 2, name: 'Rear Motor Mount',   cost: '$80–$150',   diff: 'Easy',   diffCls: 'text-stage-1', stage: 1 },
    { rank: 3, name: 'Cold Air Intake',    cost: '$180–$350',  diff: 'Easy',   diffCls: 'text-stage-1', stage: 1 },
    { rank: 4, name: 'Cat-Back Exhaust',   cost: '$450–$900',  diff: 'Medium', diffCls: 'text-stage-2', stage: 1 },
    { rank: 5, name: 'ECU Tune',           cost: '$400–$650',  diff: 'Easy',   diffCls: 'text-stage-1', stage: 2 },
  ],
}

const STATS = [
  { num: '30+', label: 'Mod Categories' },
  { num: 'AI',  label: 'Claude Powered' },
  { num: '3',   label: 'Build Stages'   },
  { num: '∞',   label: 'Saved Builds'   },
]

const VALUE_BULLETS = [
  'Get a step-by-step mod roadmap built for your car',
  'See cost, install difficulty, and performance gains upfront',
  'Avoid mismatched parts and money wasted on wrong mods',
]

/* ─── Example build card (same as before) ─── */
function ExampleCard() {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden shadow-card-lg animate-fade-up anim-delay-3"
      style={{
        background: 'rgba(16,18,24,0.88)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-display font-black text-white text-base leading-tight">{EXAMPLE.vehicle}</div>
            <div className="font-mono text-xs text-muted mt-0.5">{EXAMPLE.goal}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display font-black text-accent text-base leading-tight">{EXAMPLE.budget}</div>
            <div className="font-mono text-xs text-muted mt-0.5">total budget</div>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            <span className="font-mono text-xs text-accent font-semibold">{EXAMPLE.hpGain} est.</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="font-mono text-xs text-muted">{EXAMPLE.stage}</span>
          <div className="w-px h-3 bg-white/10" />
          <span className="font-mono text-xs text-muted">{EXAMPLE.mods.length} upgrades planned</span>
        </div>
      </div>

      <div className="grid px-5 py-2" style={{ gridTemplateColumns: '24px 1fr auto auto auto', gap: '0 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <span className="font-mono text-xs text-muted">#</span>
        <span className="font-mono text-xs text-muted">Modification</span>
        <span className="font-mono text-xs text-muted text-right">Cost</span>
        <span className="font-mono text-xs text-muted text-right">Difficulty</span>
        <span className="font-mono text-xs text-muted text-right">Stage</span>
      </div>

      {EXAMPLE.mods.map((mod, i) => (
        <div key={mod.name} className="grid px-5 py-3 hover:bg-white/[0.03] transition-colors items-center"
          style={{ gridTemplateColumns: '24px 1fr auto auto auto', gap: '0 12px', borderBottom: i < EXAMPLE.mods.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
          <span className="font-mono text-xs font-bold text-accent">#{mod.rank}</span>
          <span className="text-sm text-white font-medium">{mod.name}</span>
          <span className="font-mono text-xs text-muted text-right whitespace-nowrap">{mod.cost}</span>
          <span className={`font-mono text-xs font-semibold text-right ${mod.diffCls}`}>{mod.diff}</span>
          <span className="font-mono text-xs text-muted bg-white/[0.05] px-2 py-0.5 rounded text-right">S{mod.stage}</span>
        </div>
      ))}

      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <span className="font-mono text-xs text-muted">Generated by CarMods AI</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-stage-1" />
          <span className="font-mono text-xs text-stage-1">Stage 1 ready</span>
        </div>
      </div>
    </div>
  )
}


/* ─── Main page ─── */
export default function Landing() {
  /* Refs for scroll-reveal sections */
  const statsRef    = useReveal(0.2)
  const featuresRef = useReveal(0.05)
  const ctaRef      = useReveal(0.2)

  return (
    <div className="bg-obsidian">

      {/* ═══════════════════════════════════════════
          HERO — calm gradient backdrop, no video/imagery
      ═══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* ── Neutral atmospheric gradient ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 15%, rgba(255,255,255,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 85%, rgba(255,140,0,0.03) 0%, transparent 60%),
            linear-gradient(180deg, #0a0b0d 0%, #08090b 100%)
          `,
        }} />

        {/* ── Content ── */}
        <div className="container-content relative z-10 w-full pt-32 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center">

            {/* LEFT — Copy */}
            <div>
              <div className="animate-fade-up anim-delay-1 inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.1] text-body text-xs font-semibold tracking-[0.14em] uppercase px-4 py-2 rounded-full mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                AI Car Modification Planner
              </div>

              <h1
                className="animate-fade-up anim-delay-2 font-display font-black text-white leading-[0.96] tracking-[-0.03em] mb-6"
                style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4.4rem)' }}
              >
                Plan Your Car Build
                <br />
                <span className="text-accent" style={{ textShadow: '0 0 60px rgba(255,140,0,0.35), 0 0 120px rgba(255,140,0,0.15)' }}>
                  Before You Waste Money.
                </span>
              </h1>

              <p className="animate-fade-up anim-delay-3 text-body text-lg leading-relaxed max-w-lg mb-8">
                CarMods AI creates a personalized mod roadmap for your car, budget, goals, and skill level —
                including upgrade order, estimated costs, install difficulty, and performance impact.
              </p>

              <ul className="animate-fade-up anim-delay-4 space-y-3 mb-10">
                {VALUE_BULLETS.map(b => (
                  <li key={b} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/[0.12] border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 3.5-4" stroke="#FF8C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-body text-base leading-snug">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="animate-fade-up anim-delay-5 flex flex-wrap gap-4 mb-6">
                <Link to="/planner"
                  className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-base px-8 py-4 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow">
                  Start My Build
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link to="/example-build"
                  className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.12] text-white font-display font-semibold text-base px-8 py-4 rounded-xl hover:bg-white/[0.09] hover:border-white/[0.2] transition-all duration-150 backdrop-blur-sm">
                  See Example Build
                </Link>
              </div>

              <p className="animate-fade-up anim-delay-5 text-muted text-sm">
                Built for real car enthusiasts — from daily drivers to full performance builds.
              </p>
            </div>

            {/* RIGHT — Example build card */}
            <div className="relative">
              <ExampleCard />
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          STATS BAR — scroll reveal
      ═══════════════════════════════════════════ */}
      <div
        ref={statsRef}
        className="reveal-stagger"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(19,21,25,0.5)' }}
      >
        <div className="container-content">
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
            {STATS.map(({ num, label }) => (
              <div key={label} className="text-center py-6 px-4" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="font-display font-black text-accent text-3xl leading-none mb-2">{num}</div>
                <div className="font-mono text-xs text-muted uppercase tracking-[0.14em]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          FEATURES GRID — scroll reveal
      ═══════════════════════════════════════════ */}
      <section className="py-32">
        <div className="container-content">

          <div ref={featuresRef} className="reveal mb-20">
            <p className="eyebrow mb-4">The platform</p>
            <h2 className="font-display font-black text-white leading-[1.05] tracking-tight max-w-lg"
              style={{ fontSize: 'clamp(2.4rem, 4vw, 3.2rem)' }}>
              Built for enthusiasts.<br />Not spreadsheets.
            </h2>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden reveal-stagger"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            ref={el => {
              if (!el) return
              const obs = new IntersectionObserver(
                ([e]) => { if (e.isIntersecting) el.classList.add('visible') },
                { threshold: 0.05 }
              )
              obs.observe(el)
            }}
          >
            {FEATURES.map(f => (
              <div key={f.num}
                className="p-8 group hover:bg-elevated transition-colors duration-200"
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="font-mono text-xs text-muted mb-6 group-hover:text-accent transition-colors duration-200">{f.num}</div>
                <h3 className="font-display font-semibold text-white text-base mb-3 leading-snug">{f.title}</h3>
                <p className="text-body text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA STRIP — scroll reveal
      ═══════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        className="reveal py-28"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="container-content">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div>
              <h2 className="font-display font-black text-white mb-3 leading-tight"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
                Your garage is waiting.
              </h2>
              <p className="text-body text-lg">Park your first build in under 60 seconds.</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link to="/planner"
                className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-base px-7 py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow">
                Start My Build
              </Link>
              <Link to="/advisor"
                className="inline-flex items-center gap-2 border border-white/[0.1] text-body font-display font-medium text-base px-7 py-3.5 rounded-xl hover:border-white/[0.22] hover:text-white transition-all duration-150">
                Talk to Advisor
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
