import { Link } from 'react-router-dom'

const STEPS = [
  {
    num: '01',
    title: 'Tell us your build',
    desc: 'Your Civic Si, your budget, your goal. Beginner or experienced. We ask the right questions.',
  },
  {
    num: '02',
    title: 'Get a verified plan',
    desc: 'A staged roadmap with real parts, real costs, and fitment confirmed for your exact car. Not a guess.',
  },
  {
    num: '03',
    title: 'Track it, stage by stage',
    desc: 'Check off mods as you complete them. When a stage is done, we tell you what to check before the next one.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-obsidian text-white">

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 md:px-16 pt-32 pb-20 overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent/[0.07] rounded-full blur-[140px] pointer-events-none" />

        {/* Headline */}
        <div className="relative text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ai/20 bg-ai/[0.06] mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
            <span className="font-mono text-xs text-ai uppercase tracking-widest">Honda Civic Si</span>
          </div>

          <h1 className="font-display font-black text-7xl md:text-8xl leading-[1.0] tracking-tight mb-6">
            Know what to<br />
            <span className="text-accent">mod next.</span>
          </h1>

          <p className="text-body text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            Build a plan around your car, budget, and goals.
          </p>

          <div className="flex items-center justify-center gap-5 flex-wrap">
            <Link
              to="/planner"
              className="inline-flex items-center gap-2 px-7 py-4 bg-accent hover:bg-accent/90 text-black font-display font-bold rounded-xl transition-all duration-200 text-base"
            >
              Plan my build
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link to="/example-build" className="text-muted hover:text-white text-sm transition-colors">
              See an example ↗
            </Link>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative w-full max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-accent/[0.06] rounded-3xl blur-2xl scale-105 pointer-events-none" />

          <div className="relative bg-surface border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Build header */}
            <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-white">2022 Honda Civic Si</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-muted">Street Performance</span>
                  <span className="text-white/20">·</span>
                  <span className="font-mono text-xs text-muted">Beginner</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Budget</div>
                <div className="font-mono text-white font-semibold">$2,500</div>
              </div>
            </div>

            {/* Mod list */}
            <div className="divide-y divide-white/[0.04]">
              {[
                { n: 1, name: 'Performance Tires',  diff: 'Easy',   s: 1, cost: '$600–$900'   },
                { n: 2, name: 'Rear Motor Mount',   diff: 'Easy',   s: 1, cost: '$80–$150'    },
                { n: 3, name: 'Cold Air Intake',    diff: 'Easy',   s: 1, cost: '$250–$400'   },
                { n: 4, name: 'Cat-Back Exhaust',   diff: 'Medium', s: 1, cost: '$700–$1,200' },
                { n: 5, name: 'ECU Tune (Hondata)', diff: 'Medium', s: 2, cost: '$700–$800'   },
              ].map((mod) => (
                <div key={mod.n} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="font-display font-black text-white/20 text-sm w-5 flex-shrink-0">
                    #{mod.n}
                  </span>
                  <span className="flex-1 text-sm font-medium text-white">{mod.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                      mod.diff === 'Easy'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {mod.diff}
                    </span>
                    <span className="font-mono text-xs text-muted px-2 py-0.5 rounded-md bg-white/[0.04]">
                      S{mod.s}
                    </span>
                    <span className="font-mono text-xs text-muted w-24 text-right">{mod.cost}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-between">
              <span className="font-mono text-xs text-muted">5 mods · 2 stages · $2,330–$3,450 total</span>
              <span className="font-mono text-xs text-ai">Claude AI</span>
            </div>
          </div>
        </div>

      </section>

      {/* ── Stage tracker showcase ── */}
      <section className="px-6 md:px-16 py-28 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="font-mono text-xs text-ai uppercase tracking-widest mb-4">What makes this different</div>
            <h2 className="font-display font-black text-4xl md:text-5xl leading-tight mb-5">
              Your plan follows you.<br />
              <span className="text-muted font-black">Not the other way around.</span>
            </h2>
            <p className="text-body text-base leading-relaxed max-w-xl">
              Most tools give you a list and disappear. This one stays with you.
              Check off each mod as you complete it. When a stage is done,
              we tell you exactly what to check before you start the next one.
            </p>
          </div>

          {/* Mock stage tracker */}
          <div className="bg-surface border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-ai" />
              <span className="font-display font-bold text-ai text-sm">Stage 1</span>
              <span className="text-muted text-sm">Foundation — best return on investment</span>
              <div className="flex-1" />
              <span className="font-mono text-xs text-muted">2 of 3 complete</span>
            </div>

            <div className="divide-y divide-white/[0.05]">
              {[
                { name: 'Performance Tires', cost: '$600–$900', done: true, by: 'Shop' },
                { name: 'Rear Motor Mount', cost: '$80–$150', done: true, by: 'DIY' },
                { name: 'Cold Air Intake', cost: '$250–$400', done: false },
              ].map((mod) => (
                <div
                  key={mod.name}
                  className={`flex items-center gap-4 px-6 py-4 ${mod.done ? 'opacity-50' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    mod.done
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'border-white/20'
                  }`}>
                    {mod.done && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{mod.name}</div>
                    {mod.by && (
                      <div className="font-mono text-xs text-muted uppercase tracking-wider mt-0.5">{mod.by}</div>
                    )}
                  </div>
                  <div className="font-mono text-xs text-muted">{mod.cost}</div>
                </div>
              ))}
            </div>

            <div className="mx-6 mb-6 mt-3 p-4 rounded-xl border border-ai/20 bg-ai/[0.06] flex gap-3">
              <div className="w-1 rounded-full bg-ai/40 flex-shrink-0" />
              <div>
                <div className="font-mono text-xs text-ai uppercase tracking-wider mb-1.5">
                  Stage 1 complete — before you start Stage 2
                </div>
                <p className="text-sm text-body leading-relaxed">
                  Tires and motor mount are solid. Before adding the intake,
                  confirm your 1.5T has the correct FE1 bracket version —
                  some early builds need a minor modification. Ten minutes to
                  verify saves you a return shipping headache.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 md:px-16 py-28 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="font-mono text-xs text-muted uppercase tracking-widest mb-16">How it works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {STEPS.map((step) => (
              <div key={step.num}>
                <div className="font-display font-black text-6xl text-white/[0.07] mb-5 leading-none">
                  {step.num}
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-3">{step.title}</h3>
                <p className="text-body text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-6 md:px-16 py-28 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <div className="font-mono text-xs text-muted uppercase tracking-widest mb-4">Pricing</div>
          <h2 className="font-display font-black text-4xl md:text-5xl mb-16">Simple. No surprises.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Free */}
            <div className="bg-surface border border-white/[0.07] rounded-2xl p-8">
              <div className="font-mono text-xs text-muted uppercase tracking-wider mb-8">Free</div>
              <div className="font-display font-black text-5xl text-white mb-1">$0</div>
              <div className="text-muted text-sm mb-10">Forever</div>
              <ul className="space-y-4 mb-10">
                {[
                  '1 saved build',
                  'Full stage tracker',
                  '15 advisor messages / day',
                  'Verified parts & fitment',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-body">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/planner"
                className="block text-center py-3.5 border border-white/[0.12] hover:border-white/30 rounded-xl text-sm text-white transition-colors"
              >
                Start for free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-surface border border-ai/25 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-ai/[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="font-mono text-xs text-ai uppercase tracking-wider mb-8">Pro</div>
              <div className="font-display font-black text-5xl text-white mb-1">$5</div>
              <div className="text-muted text-sm mb-10">per month</div>
              <ul className="space-y-4 mb-10">
                {[
                  'Unlimited saved builds',
                  'Full stage tracker on all builds',
                  'Unlimited advisor messages',
                  'Priority support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-body">
                    <div className="w-1.5 h-1.5 rounded-full bg-ai flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/planner"
                className="block text-center py-3.5 bg-accent hover:bg-accent/90 rounded-xl text-sm font-bold text-black transition-colors"
              >
                Start My Build
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="px-6 md:px-16 py-28 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-black text-5xl md:text-6xl leading-tight mb-6">
            Your Civic Si deserves<br />
            <span className="text-ai">a real plan.</span>
          </h2>
          <p className="text-body text-base mb-10">
            Free to start. No credit card needed.
          </p>
          <Link
            to="/planner"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent/90 text-black font-display font-bold rounded-xl transition-all duration-200 text-base"
          >
            Start My Build
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

    </div>
  )
}
