import { Link } from 'react-router-dom'

const FEATURES = [
  {
    num: '01',
    title: 'Your Digital Garage',
    desc: 'Every build lives in your personal garage. Track progress, budget, and upgrades across multiple vehicles — all in one place.',
  },
  {
    num: '02',
    title: 'Platform Intelligence',
    desc: 'Recommendations built around your exact platform. A WRX build is not a GTI build. We know the difference.',
  },
  {
    num: '03',
    title: 'Staged Build Roadmap',
    desc: 'Stage 1 → 2 → 3. Start with the highest-impact, most affordable mods first. Scale up when you\'re ready.',
  },
  {
    num: '04',
    title: 'Honest Trade-offs',
    desc: "We tell you when a mod isn't worth the money, needs other mods done first, or is better left to a professional.",
  },
  {
    num: '05',
    title: 'Performance Advisor',
    desc: 'Ask anything — mod order, brand picks, budget breakdowns, compatibility. An expert tuner in your pocket.',
  },
  {
    num: '06',
    title: 'Real Investment Numbers',
    desc: 'Actual price ranges, not guesses. See exactly what your build costs before you spend a dollar.',
  },
]

const EXAMPLE_MODS = [
  { name: 'Cold Air Intake',     price: '$150–$400',   stage: 1, diff: 'Easy',   diffCls: 'text-stage-1' },
  { name: 'Cat-Back Exhaust',    price: '$400–$1,400', stage: 1, diff: 'Medium', diffCls: 'text-stage-2' },
  { name: 'Coilover Suspension', price: '$700–$2,800', stage: 1, diff: 'Medium', diffCls: 'text-stage-2' },
  { name: 'ECU Tune',            price: '$400–$900',   stage: 2, diff: 'Easy',   diffCls: 'text-stage-1' },
  { name: 'Downpipe Upgrade',    price: '$300–$900',   stage: 2, diff: 'Hard',   diffCls: 'text-stage-3' },
]

const STAGE_DOT = {
  1: 'bg-stage-1',
  2: 'bg-stage-2',
  3: 'bg-stage-3',
}

const STATS = [
  { num: '30+', label: 'Mod Categories' },
  { num: 'AI',  label: 'Claude Powered' },
  { num: '3',   label: 'Build Stages'   },
  { num: '∞',   label: 'Saved Builds'  },
]

export default function Landing() {
  return (
    <div className="bg-obsidian">

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">

        {/* Background photo + gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(105deg,
                rgba(8,9,11,1)    0%,
                rgba(8,9,11,0.97) 28%,
                rgba(8,9,11,0.75) 52%,
                rgba(8,9,11,0.25) 78%,
                rgba(8,9,11,0.1)  100%
              ),
              linear-gradient(to bottom,
                rgba(8,9,11,0.4) 0%,
                transparent 20%,
                transparent 70%,
                rgba(8,9,11,1) 100%
              ),
              url('https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1920&q=85')
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
          }}
        />

        {/* Subtle orange radial glow bottom-right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 55% 40% at 80% 25%, rgba(255,140,0,0.04) 0%, transparent 65%)',
          }}
        />

        {/* Grid texture overlay */}
        <div className="absolute inset-0 grid-texture opacity-40 pointer-events-none" />

        {/* Content */}
        <div className="container-content relative z-10 pt-36 pb-28 w-full">
          <div className="max-w-2xl">

            {/* Pill badge */}
            <div className="animate-fade-up anim-delay-1 inline-flex items-center gap-2.5 bg-accent/[0.08] border border-accent/25 text-accent-bright text-[11px] font-mono font-semibold tracking-[0.18em] uppercase px-4 py-2 rounded-full mb-10 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
              AI-Powered Car Modification Planner
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up anim-delay-2 font-display font-black text-white leading-[0.94] tracking-[-0.03em] mb-8"
              style={{ fontSize: 'clamp(3.8rem, 8.5vw, 7.5rem)' }}
            >
              Build Smarter.
              <br />
              <span
                className="text-accent"
                style={{ textShadow: '0 0 80px rgba(255,140,0,0.35), 0 0 160px rgba(255,140,0,0.12)' }}
              >
                Not Harder.
              </span>
            </h1>

            {/* Subheading */}
            <p className="animate-fade-up anim-delay-3 text-body text-[1.15rem] leading-[1.75] max-w-[480px] mb-12">
              Your digital garage. AI-powered build plans, staged upgrade roadmaps,
              and a performance advisor that knows your platform — not generic advice.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-up anim-delay-4 flex flex-wrap gap-4 mb-24">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-[15px] px-8 py-4 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow"
              >
                Start Your Build
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                to="/advisor"
                className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white font-display font-semibold text-[15px] px-8 py-4 rounded-xl hover:bg-white/[0.09] hover:border-white/[0.18] transition-all duration-150 backdrop-blur-sm"
              >
                Talk to Advisor
              </Link>
            </div>

            {/* Preview card — sample build */}
            <div
              className="animate-fade-up anim-delay-5 max-w-[560px] rounded-2xl overflow-hidden shadow-card-lg"
              style={{
                background: 'rgba(19,21,25,0.82)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
              >
                <span className="font-mono text-muted text-xs">2020 Toyota Supra · $6,000 budget</span>
                <span className="font-mono text-accent text-xs font-semibold">~$1,950 avg</span>
              </div>

              {/* Mod rows */}
              {EXAMPLE_MODS.map((mod, i) => (
                <div
                  key={mod.name}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors"
                  style={i < EXAMPLE_MODS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[mod.stage]}`} />
                    <span className="text-sm text-white/90 font-medium">{mod.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-muted">{mod.price}</span>
                    <span className={`font-mono text-[11px] font-semibold ${mod.diffCls}`}>{mod.diff}</span>
                    <span className="font-mono text-[10px] text-muted bg-white/[0.06] px-2 py-0.5 rounded">
                      S{mod.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(19,21,25,0.5)' }}>
        <div className="container-content">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ '--tw-divide-opacity': '1' }}>
            {STATS.map(({ num, label }) => (
              <div key={label} className="text-center py-6 px-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="font-display font-black text-accent text-3xl leading-none mb-1.5">{num}</div>
                <div className="font-mono text-[10px] text-muted uppercase tracking-[0.16em]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Features grid ─── */}
      <section className="py-28">
        <div className="container-content">
          {/* Section header */}
          <div className="mb-16">
            <p className="eyebrow mb-4">The platform</p>
            <h2
              className="font-display font-black text-white leading-[1.05] tracking-tight max-w-lg"
              style={{ fontSize: 'clamp(2.4rem, 4vw, 3.2rem)' }}
            >
              Built for enthusiasts.<br />Not spreadsheets.
            </h2>
          </div>

          {/* Grid — separated by hairlines, editorial numbered style */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="p-8 group hover:bg-elevated transition-colors duration-200"
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="font-mono text-muted text-xs mb-6 group-hover:text-accent transition-colors duration-200">
                  {f.num}
                </div>
                <h3 className="font-display font-semibold text-white text-[17px] mb-3 leading-snug">
                  {f.title}
                </h3>
                <p className="text-body text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA section ─── */}
      <section
        className="py-24"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="container-content">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div>
              <h2
                className="font-display font-black text-white mb-3 leading-tight"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}
              >
                Your garage is waiting.
              </h2>
              <p className="text-body text-lg">Park your first build in under 60 seconds.</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-sm px-7 py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow"
              >
                Build My Garage
              </Link>
              <Link
                to="/advisor"
                className="inline-flex items-center gap-2 border border-white/[0.1] text-body font-display font-medium text-sm px-7 py-3.5 rounded-xl hover:border-white/[0.22] hover:text-white transition-all duration-150"
              >
                Talk to Advisor
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
