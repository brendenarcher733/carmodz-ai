import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { buildsApi } from '../services/api'
import s from './Planner.module.css'
import clsx from 'clsx'

const GOALS = [
  { value: 'daily driver upgrades',      label: 'Daily Driver',     icon: '🚗', desc: 'Comfortable, reliable, noticeably better' },
  { value: 'budget performance build',   label: 'Budget Build',     icon: '💰', desc: 'Maximum impact per dollar' },
  { value: 'street performance',         label: 'Street Performance', icon: '🏎️', desc: 'Fast on the street, still driveable' },
  { value: 'track focused setup',        label: 'Track Build',       icon: '🏁', desc: 'Circuit performance, safety first' },
  { value: 'cosmetic upgrades',          label: 'Cosmetic',          icon: '✨', desc: 'Looks, stance, and presence' },
  { value: 'sound upgrades',             label: 'Sound Build',       icon: '🔊', desc: 'Exhaust, audio, and induction sound' },
  { value: 'reliability first',          label: 'Reliability',       icon: '🔒', desc: 'Foundation maintenance and longevity' },
  { value: 'max power',                  label: 'Max Power',         icon: '⚡', desc: 'All-out power build' },
]

const CATEGORIES = [
  { value: 'performance', label: 'Performance', icon: '🔥' },
  { value: 'handling',    label: 'Handling',    icon: '🎯' },
  { value: 'sound',       label: 'Sound',       icon: '🔊' },
  { value: 'cosmetic',    label: 'Cosmetic',    icon: '💅' },
  { value: 'reliability', label: 'Reliability', icon: '🔩' },
  { value: 'interior',    label: 'Interior',    icon: '🪑' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'New to modding, prefer easy DIY or shop installs' },
  { value: 'intermediate', label: 'Intermediate',  desc: 'Comfortable with tools, done a few mods' },
  { value: 'advanced',     label: 'Advanced',      desc: 'Full builds, track days, tuning experience' },
]

const STEPS = ['Vehicle', 'Budget & Goals', 'Preferences', 'Review']

const BUILD_MESSAGES = [
  'Analyzing your build specs...',
  'Researching real aftermarket parts...',
  'Checking compatibility for your platform...',
  'Calculating budget allocation...',
  'Ranking mods by impact per dollar...',
  'Staging your upgrade roadmap...',
  'Cross-referencing brand recommendations...',
  'Reviewing safety and difficulty ratings...',
  'Finalizing your build plan...',
]

function BuildingOverlay({ vehicle }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % BUILD_MESSAGES.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={s.overlay}>
      <div className={s.overlayCard}>
        <div className={s.overlayOrb}>
          <div className={s.overlayRing} />
          <div className={s.overlayRing2} />
          <span className={s.overlayGear}>⚙</span>
        </div>
        <h2 className={s.overlayTitle}>Generating Your Build</h2>
        <p key={idx} className={s.overlayMsg}>
          {vehicle ? BUILD_MESSAGES[idx].replace('your platform', `your ${vehicle}`) : BUILD_MESSAGES[idx]}
        </p>
        <div className={s.overlayDots}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}

export default function Planner() {
  const navigate = useNavigate()
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [form, setForm]     = useState({
    title: '', year: '', make: '', model: '', budget: '',
    goal: '', experience: 'intermediate', categories: [],
    is_daily: true, notes: '',
  })

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  function toggleCat(cat) {
    setForm(p => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter(c => c !== cat)
        : [...p.categories, cat]
    }))
  }

  function canAdvance() {
    if (step === 0) return form.year && form.make && form.model
    if (step === 1) return form.budget > 0 && form.goal
    if (step === 2) return form.experience
    return true
  }

  async function submit() {
    setLoading(true); setError(null)
    try {
      const payload = {
        ...form,
        title: form.title || `${form.year} ${form.make} ${form.model}`,
        year: parseInt(form.year),
        budget: parseFloat(form.budget),
      }
      const build = await buildsApi.create(payload)
      navigate(`/builds/${build.id}`)
    } catch (e) { setError(e.message); setLoading(false) }
  }

  const vehicleLabel = [form.year, form.make, form.model].filter(Boolean).join(' ')

  return (
    <div className={s.page}>
      {loading && <BuildingOverlay vehicle={vehicleLabel} />}
      <div className={`container ${s.inner}`}>
        {/* Header */}
        <div className={s.header}>
          <p className={s.eyebrow}>// BUILD PLANNER</p>
          <h1 className={s.title}>Plan Your Build</h1>
          <p className={s.sub}>Fill in your vehicle info and goals — we'll generate a realistic, staged mod plan.</p>
        </div>

        {/* Step indicator */}
        <div className={s.steps}>
          {STEPS.map((label, i) => (
            <div key={label} className={clsx(s.step, i === step && s.stepActive, i < step && s.stepDone)}>
              <div className={s.stepNum}>{i < step ? '✓' : i + 1}</div>
              <span className={s.stepLabel}>{label}</span>
              {i < STEPS.length - 1 && <div className={clsx(s.stepLine, i < step && s.stepLineDone)} />}
            </div>
          ))}
        </div>

        <Card padding="xl" className={s.formCard}>

          {/* Step 0: Vehicle */}
          {step === 0 && (
            <div className={`animate-fade-in ${s.stepContent}`}>
              <h2 className={s.stepTitle}>What are you building on?</h2>
              <div className={s.formGrid3}>
                <div className={s.field}>
                  <label className={s.label}>Year <span className={s.req}>*</span></label>
                  <input className={s.input} type="number" placeholder="2020" min="1950" max="2026"
                    value={form.year} onChange={e => set('year', e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Make <span className={s.req}>*</span></label>
                  <input className={s.input} type="text" placeholder="Toyota"
                    value={form.make} onChange={e => set('make', e.target.value)} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Model <span className={s.req}>*</span></label>
                  <input className={s.input} type="text" placeholder="Supra"
                    value={form.model} onChange={e => set('model', e.target.value)} />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Build Title <span className={s.opt}>(optional)</span></label>
                <input className={s.input} type="text" placeholder="e.g. JDM Street Build, Weekend Track Car"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Budget & Goals */}
          {step === 1 && (
            <div className={`animate-fade-in ${s.stepContent}`}>
              <h2 className={s.stepTitle}>Budget and primary goal</h2>
              <div className={s.field}>
                <label className={s.label}>Total Budget (USD) <span className={s.req}>*</span></label>
                <div className={s.budgetWrap}>
                  <span className={s.budgetSign}>$</span>
                  <input className={clsx(s.input, s.budgetInput)} type="number" placeholder="5000" min="1"
                    value={form.budget} onChange={e => set('budget', e.target.value)} />
                </div>
                {form.budget && parseFloat(form.budget) < 500 && (
                  <p className={s.budgetWarn}>⚠️ Under $500 limits options. $1,000+ gives you more to work with.</p>
                )}
              </div>
              <div className={s.field}>
                <label className={s.label}>Primary Build Goal <span className={s.req}>*</span></label>
                <div className={s.goalGrid}>
                  {GOALS.map(g => (
                    <button key={g.value} type="button"
                      className={clsx(s.goalBtn, form.goal === g.value && s.goalSelected)}
                      onClick={() => set('goal', g.value)}>
                      <span className={s.goalIcon}>{g.icon}</span>
                      <span className={s.goalLabel}>{g.label}</span>
                      <span className={s.goalDesc}>{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className={`animate-fade-in ${s.stepContent}`}>
              <h2 className={s.stepTitle}>Your preferences</h2>
              <div className={s.field}>
                <label className={s.label}>Experience Level <span className={s.req}>*</span></label>
                <div className={s.expGrid}>
                  {EXPERIENCE_LEVELS.map(e => (
                    <button key={e.value} type="button"
                      className={clsx(s.expBtn, form.experience === e.value && s.expSelected)}
                      onClick={() => set('experience', e.value)}>
                      <span className={s.expLabel}>{e.label}</span>
                      <span className={s.expDesc}>{e.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Mod Categories <span className={s.opt}>(all if none selected)</span></label>
                <div className={s.catGrid}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      className={clsx(s.catBtn, form.categories.includes(c.value) && s.catSelected)}
                      onClick={() => toggleCat(c.value)}>
                      <span>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.dailyRow}>
                <label className={s.label}>Vehicle Use</label>
                <div className={s.toggle}>
                  <button type="button" className={clsx(s.toggleBtn, form.is_daily && s.toggleActive)}
                    onClick={() => set('is_daily', true)}>🚗 Daily Driver</button>
                  <button type="button" className={clsx(s.toggleBtn, !form.is_daily && s.toggleActive)}
                    onClick={() => set('is_daily', false)}>🔧 Project Car</button>
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Notes <span className={s.opt}>(optional)</span></label>
                <textarea className={s.textarea} rows={3}
                  placeholder="Anything specific? e.g. 'Want to hit 400whp eventually' or 'Mostly highway driving'"
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className={`animate-fade-in ${s.stepContent}`}>
              <h2 className={s.stepTitle}>Review your build spec</h2>
              <div className={s.reviewGrid}>
                {[
                  ['Vehicle',    `${form.year} ${form.make} ${form.model}`],
                  ['Budget',     `$${parseFloat(form.budget || 0).toLocaleString()}`],
                  ['Goal',       form.goal],
                  ['Experience', form.experience],
                  ['Use',        form.is_daily ? 'Daily Driver' : 'Project Car'],
                  ['Categories', form.categories.length ? form.categories.join(', ') : 'All categories'],
                ].map(([k, v]) => (
                  <div key={k} className={s.reviewRow}>
                    <span className={s.reviewKey}>{k}</span>
                    <span className={s.reviewVal}>{v}</span>
                  </div>
                ))}
                {form.notes && (
                  <div className={s.reviewRow}>
                    <span className={s.reviewKey}>Notes</span>
                    <span className={s.reviewVal}>{form.notes}</span>
                  </div>
                )}
              </div>
              {error && <div className={s.error}>{error}</div>}
            </div>
          )}

          {/* Navigation */}
          <div className={s.nav}>
            <Button variant="ghost" onClick={() => setStep(p => p - 1)} disabled={step === 0}>← Back</Button>
            <div className={s.navRight}>
              {step < 3
                ? <Button onClick={() => setStep(p => p + 1)} disabled={!canAdvance()}>Continue →</Button>
                : <Button onClick={submit} loading={loading} size="lg">Generate My Build Plan 🚀</Button>
              }
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
