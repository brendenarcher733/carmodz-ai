import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import s from './Landing.module.css'

const FEATURES = [
  { icon: '🧠', title: 'AI-Powered Planning',   desc: 'Tell the Mod Advisor your goals. Get a realistic, staged build plan tailored to your car and budget — not generic advice.' },
  { icon: '💰', title: 'Budget-First Thinking', desc: 'Every recommendation respects your budget. See price ranges, prioritized lists, and what to buy first for maximum impact.' },
  { icon: '🗺️', title: 'Staged Roadmap',         desc: 'Stage 1 → 2 → 3 build paths. Start smart, scale up. No wasted money, no regret purchases.' },
  { icon: '⚠️', title: 'Real Warnings',          desc: "We'll tell you when a mod is too expensive, potentially unsafe, or needs other mods done first. Honest advice, not just hype." },
  { icon: '💾', title: 'Save Your Builds',       desc: 'Store multiple build plans. Pick up where you left off, compare approaches, or share your build roadmap.' },
  { icon: '🔧', title: 'Deep Mod Knowledge',     desc: 'From intakes and exhausts to suspension and ECU tunes — the advisor knows the right order, brands, and tradeoffs.' },
]

const EXAMPLE_MODS = [
  { name: 'Cold Air Intake',     price: '$150–$400',   stage: 1, diff: 'Easy'   },
  { name: 'Cat-Back Exhaust',    price: '$400–$1,400', stage: 1, diff: 'Medium' },
  { name: 'Coilover Suspension', price: '$700–$2,800', stage: 1, diff: 'Medium' },
  { name: 'ECU Tune',            price: '$400–$900',   stage: 2, diff: 'Easy'   },
  { name: 'Downpipe Upgrade',    price: '$300–$900',   stage: 2, diff: 'Hard'   },
]

const DIFF_COLOR  = { Easy: 'var(--easy)', Medium: 'var(--medium)', Hard: 'var(--hard)' }
const STAGE_COLOR = { 1: 'var(--stage1)', 2: 'var(--stage2)', 3: 'var(--stage3)' }

const STATS = [
  { num: '30+',  label: 'Mod Categories' },
  { num: 'AI',   label: 'Powered by Claude' },
  { num: '3',    label: 'Build Stages' },
  { num: '∞',    label: 'Saved Builds' },
]

export default function Landing() {
  return (
    <div className={s.page}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroBg} />
        <div className={`container ${s.heroInner}`}>
          <div className={`${s.pill} animate-fade-up`}>
            <span className={s.pillDot} /> AI-Powered Car Modification Planner
          </div>
          <h1 className={`${s.headline} animate-fade-up delay-1`}>
            Build Smarter.
            <span className={s.headlineAccent}>Not Harder.</span>
          </h1>
          <p className={`${s.sub} animate-fade-up delay-2`}>
            Stop guessing which mods to buy first. CarMods AI builds a realistic, staged upgrade plan
            for your specific car, budget, and goals — and tells you exactly what to avoid.
          </p>
          <div className={`${s.heroActions} animate-fade-up delay-3`}>
            <Link to="/planner">
              <Button size="xl">Start Your Build Plan →</Button>
            </Link>
            <Link to="/advisor">
              <Button size="xl" variant="secondary">Talk to Mod Advisor</Button>
            </Link>
          </div>

          <div className={`${s.heroStats} animate-fade-up delay-4`}>
            {STATS.map(({ num, label }) => (
              <div key={label} className={s.stat}>
                <span className={s.statNum}>{num}</span>
                <span className={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* Preview card */}
          <div className={`${s.previewCard} animate-fade-up delay-5`}>
            <div className={s.previewHeader}>
              <span className={s.previewTitle}>Sample Build — 2020 Toyota Supra · $6,000 Budget</span>
              <span className={s.previewBudget}>$1,950 avg spend</span>
            </div>
            <div className={s.previewMods}>
              {EXAMPLE_MODS.map((mod) => (
                <div key={mod.name} className={s.previewMod}>
                  <div className={s.modLeft}>
                    <span className={s.stageDot} style={{ background: STAGE_COLOR[mod.stage] }} />
                    <span className={s.modName}>{mod.name}</span>
                  </div>
                  <div className={s.modRight}>
                    <span className={s.modPrice}>{mod.price}</span>
                    <span className={s.modDiff} style={{ color: DIFF_COLOR[mod.diff] }}>{mod.diff}</span>
                    <span className={s.modStage}>S{mod.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={s.features}>
        <div className="container">
          <div className={s.sectionHead}>
            <p className={s.eyebrow}>What It Does</p>
            <h2 className={s.sectionTitle}>Everything you need to plan a real build</h2>
          </div>
          <div className={s.featureGrid}>
            {FEATURES.map((f, i) => (
              <Card key={f.title} hover className={`animate-fade-up delay-${(i % 5) + 1}`}>
                <div className={s.featureIcon}>{f.icon}</div>
                <h3 className={s.featureTitle}>{f.title}</h3>
                <p className={s.featureDesc}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className={s.ctaStrip}>
        <div className="container">
          <div className={s.ctaInner}>
            <div>
              <h2 className={s.ctaTitle}>Ready to start building?</h2>
              <p className={s.ctaSub}>Takes 60 seconds. No account required.</p>
            </div>
            <div className={s.ctaActions}>
              <Link to="/planner"><Button size="lg">Open Build Planner</Button></Link>
              <Link to="/advisor"><Button size="lg" variant="ghost">Chat with Advisor</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
