import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildsApi, plansApi, vehiclesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import * as analytics from '../services/analytics'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import clsx from 'clsx'

/* ─── Vehicle data ───
   Was a hardcoded MAKE_GROUPS/MODELS object (no year data at all, and not
   shared with the backend) — now sourced live from the vehicle catalog API
   (backend/routers/vehicles.py) so "is this a real make/model" and "what
   years were verified" come from one authoritative place instead of being
   duplicated and drifting. See VehicleSelector below. */

// Fallback quick-year picks when no catalog model is selected yet (free-text
// "my vehicle isn't listed" path) — current year down 6, same width as before.
const CURRENT_YEAR = new Date().getFullYear()
const QUICK_YEARS  = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - i)

/* ─── Build goals ─── */

const GOALS = [
  { value: 'daily driver upgrades',    label: 'Daily Driver',       desc: 'Comfortable, reliable, noticeably better' },
  { value: 'budget performance build', label: 'Budget Build',       desc: 'Maximum impact per dollar' },
  { value: 'street performance',       label: 'Street Performance', desc: 'Fast on the street, still driveable' },
  { value: 'track focused setup',      label: 'Track Build',        desc: 'Circuit performance, safety first' },
  { value: 'cosmetic upgrades',        label: 'Cosmetic',           desc: 'Looks, stance, and presence' },
  { value: 'sound upgrades',           label: 'Sound Build',        desc: 'Exhaust, audio, induction' },
  { value: 'reliability first',        label: 'Reliability',        desc: 'Foundation maintenance and longevity' },
  { value: 'max power',                label: 'Max Power',          desc: 'All-out power build' },
]

const CATEGORIES = [
  { value: 'performance', label: 'Performance' },
  { value: 'handling',    label: 'Handling' },
  { value: 'sound',       label: 'Sound' },
  { value: 'cosmetic',    label: 'Cosmetic' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'interior',    label: 'Interior' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'New to modding, prefer shop installs' },
  { value: 'intermediate', label: 'Intermediate',  desc: 'Comfortable with tools, done a few mods' },
  { value: 'advanced',     label: 'Advanced',      desc: 'Full builds, track days, tuning experience' },
]

const STEPS = ['Platform', 'Budget & Goal', 'Preferences', 'Review']

const LOADING_MSGS = [
  'Analyzing your platform…',
  'Sourcing real aftermarket parts…',
  'Checking platform compatibility…',
  'Calculating budget allocation…',
  'Ranking upgrades by impact-per-dollar…',
  'Mapping your stage roadmap…',
  'Cross-referencing brand recommendations…',
  'Reviewing install difficulty ratings…',
  'Locking in your build plan…',
]

/* ─── Loading overlay ─── */

function BuildingOverlay({ vehicle }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MSGS.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/95 backdrop-blur-xl">
      <div className="relative text-center max-w-sm px-8">
        <div className="relative w-16 h-16 mx-auto mb-10">
          <Spinner variant="ai" size="lg" className="absolute inset-0 w-16 h-16" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ai">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="font-display font-black text-white text-2xl mb-2 tracking-tight">Building Your Garage</h2>
        {vehicle && <p className="text-xs text-muted uppercase tracking-widest mb-5">{vehicle}</p>}
        <p key={idx} className="text-body text-sm leading-relaxed animate-fade-in">{LOADING_MSGS[idx]}</p>
      </div>
    </div>
  )
}

/* ─── Step bar ─── */

function StepBar({ current }) {
  return (
    <div className="mb-8 md:mb-12">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const done = i < current, active = i === current
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all duration-300',
                  done   && 'bg-accent text-obsidian',
                  active && 'bg-accent text-obsidian',
                  !done && !active && 'bg-surface border border-white/[0.1] text-muted',
                )}>
                  {done
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : i + 1}
                </div>
                <span className={clsx(
                  'text-xs font-mono uppercase tracking-wider hidden sm:block',
                  active ? 'text-accent' : done ? 'text-body' : 'text-muted',
                )}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={clsx(
                  'flex-1 h-px mx-2 transition-all duration-300',
                  done ? 'bg-accent' : 'bg-white/[0.07]',
                )} />
              )}
            </div>
          )
        })}
      </div>
      {/* Step labels are hidden on the circles themselves below `sm` (no
          room) — this compact line keeps textual context on phones. */}
      <p className="sm:hidden text-center text-accent text-xs font-mono uppercase tracking-wider mt-3">
        Step {current + 1} of {STEPS.length} — {STEPS[current]}
      </p>
    </div>
  )
}

/* ─── Step 0: Vehicle Platform Selector ───
   Makes/models come from the vehicle catalog API — this component never
   invents or silently accepts a make/model/year the backend hasn't either
   verified or at least is willing to treat as "unverified, but allowed"
   (see backend/services/vehicle_service.py). The one deliberate escape
   hatch is "My vehicle isn't listed" below, which is an explicit opt-in to
   free text, not an automatic fallback. */

function VehicleSelector({ form, set }) {
  const [yearMode, setYearMode]   = useState('quick')
  const [search, setSearch]       = useState('')
  const [unlisted, setUnlisted]   = useState(false)

  const [makes, setMakes]               = useState([])
  const [makesLoading, setMakesLoading] = useState(true)
  const [makesError, setMakesError]     = useState(null)

  const [models, setModels]               = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setMakesLoading(true)
    setMakesError(null)
    vehiclesApi.getMakes()
      .then(data => { if (!cancelled) setMakes(data) })
      .catch(() => { if (!cancelled) setMakesError("Couldn't load the vehicle list right now.") })
      .finally(() => { if (!cancelled) setMakesLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!form.make || unlisted) { setModels([]); return }
    let cancelled = false
    setModelsLoading(true)
    setModelsError(null)
    vehiclesApi.getModels(form.make)
      .then(data => { if (!cancelled) setModels(data) })
      .catch(() => { if (!cancelled) { setModels([]); setModelsError("Couldn't load models for this make right now.") } })
      .finally(() => { if (!cancelled) setModelsLoading(false) })
    return () => { cancelled = true }
  }, [form.make, unlisted])

  const filteredMakes = useMemo(() => {
    if (!search.trim()) return makes
    const q = search.toLowerCase()
    return makes.filter(m => m.name.toLowerCase().includes(q))
  }, [makes, search])

  const selectedModel = models.find(m => m.name === form.model) || null

  // Every individually-valid year across the selected model's active
  // production ranges — NOT a min/max span. Some real nameplates have a
  // production gap or multiple generations (Dodge Viper, Acura/Honda NSX,
  // classic Supra vs. GR Supra), so a year sitting between the earliest
  // start and the latest end isn't necessarily a year that was ever
  // produced. See backend/models/vehicle.py::VehicleProductionRange.
  const validYears = useMemo(() => {
    if (!selectedModel) return null
    const years = new Set()
    selectedModel.production_ranges.forEach(r => {
      const end = Math.min(r.production_year_end ?? (CURRENT_YEAR + 1), CURRENT_YEAR + 1)
      for (let y = r.production_year_start; y <= end; y++) years.add(y)
    })
    return [...years].sort((a, b) => b - a) // newest first
  }, [selectedModel])

  // Quick-pick shows the newest 7 valid years; an older generation's years
  // (e.g. a gapped model's earlier range) are still reachable via "Other…"
  // and are still validated against the full set, just not quick-picked.
  const yearChoices = validYears ? validYears.slice(0, 7) : QUICK_YEARS
  const isYearValid = (y) => !validYears || validYears.includes(Number(y))

  const yearInputBounds = useMemo(() => {
    if (!selectedModel) return { min: 1950, max: CURRENT_YEAR + 1 }
    const starts = selectedModel.production_ranges.map(r => r.production_year_start)
    const ends = selectedModel.production_ranges.map(r => r.production_year_end ?? CURRENT_YEAR + 1)
    return { min: Math.min(...starts), max: Math.max(...ends) }
  }, [selectedModel])

  const selectMake = (name) => {
    set('make', name)
    set('model', '')
    set('year', '')
    setSearch('')
  }

  const selectModel = (model) => {
    set('model', model.name)
    set('year', '')
  }

  const enterUnlisted = () => {
    setUnlisted(true)
    set('make', '')
    set('model', '')
    set('year', '')
    setSearch('')
  }

  const exitUnlisted = () => {
    setUnlisted(false)
    set('make', '')
    set('model', '')
    set('year', '')
  }

  if (unlisted) {
    return (
      <div className="animate-fade-in">
        <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
          Tell us about your vehicle.
        </h2>
        <p className="text-body text-sm mb-8">
          Not in our catalog yet — we'll still build a plan, just without a verified-fitment guarantee.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="field-label mb-2">Make</label>
            <input
              className="field-input"
              placeholder="e.g. Yugo"
              value={form.make}
              onChange={e => set('make', e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="field-label mb-2">Model</label>
            <input
              className="field-input"
              placeholder="e.g. GV"
              value={form.model}
              onChange={e => set('model', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label mb-2">Year</label>
            <input
              className="field-input max-w-[140px]"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1986"
              min="1950"
              max={CURRENT_YEAR + 1}
              value={form.year}
              onChange={e => set('year', e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={exitUnlisted}
          className="focus-ring rounded-md text-muted text-sm hover:text-body transition-colors"
        >
          ← Back to the vehicle list
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
        Pick your platform.
      </h2>
      <p className="text-body text-sm mb-8">Supercars, JDM, muscle, and everything in between.</p>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          className="field-input pl-9 text-base md:text-sm"
          placeholder="Search makes — Ferrari, Lamborghini, Honda…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={makesLoading}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="focus-ring rounded-md absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-body"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Loading / error / empty / makes grid ── */}
      {makesLoading && (
        <div className="flex items-center gap-3 text-muted text-sm mb-8 py-6">
          <Spinner size="sm" />
          Loading vehicle catalog…
        </div>
      )}

      {!makesLoading && makesError && (
        <div className="mb-8">
          <Alert variant="error">{makesError}</Alert>
        </div>
      )}

      {!makesLoading && !makesError && (
        <div className="mb-8">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {filteredMakes.map(make => (
              <button
                key={make.id}
                type="button"
                onClick={() => selectMake(make.name)}
                className={clsx(
                  'focus-ring px-3 py-2.5 rounded-xl border text-sm font-display font-semibold transition-all duration-200 text-left leading-tight',
                  form.make === make.name
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.18] hover:text-white',
                )}
              >
                {make.name}
              </button>
            ))}
          </div>
          {filteredMakes.length === 0 && (
            <p className="text-muted text-sm mt-3">No makes match "{search}".</p>
          )}
        </div>
      )}

      {/* ── Model grid ── */}
      {form.make && (
        <div className="mb-8 animate-fade-in">
          <label className="field-label mb-3">Model <span className="text-accent">·</span> {form.make}</label>

          {modelsLoading && (
            <div className="flex items-center gap-3 text-muted text-sm py-4">
              <Spinner size="sm" />
              Loading models…
            </div>
          )}

          {!modelsLoading && models.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {models.map(model => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => selectModel(model)}
                  className={clsx(
                    'focus-ring px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 text-left leading-snug',
                    form.model === model.name
                      ? 'bg-accent/10 border-accent/40 text-white'
                      : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.14] hover:text-white',
                  )}
                >
                  {model.name}
                  <span className="block font-mono text-[10px] text-muted mt-0.5">
                    {model.production_ranges
                      .map(r => `${r.production_year_start}–${r.production_year_end ?? 'present'}`)
                      .join(', ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!modelsLoading && models.length === 0 && (
            <p className="text-muted text-sm">
              {modelsError || `No verified ${form.make} models yet — you can still continue with "My vehicle isn't listed" below.`}
            </p>
          )}
        </div>
      )}

      {/* ── Year ── */}
      {form.make && form.model && (
        <div className="animate-fade-in">
          <label className="field-label mb-3">Year</label>
          {yearMode === 'quick' ? (
            <div className="flex flex-wrap gap-2">
              {yearChoices.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { set('year', String(y)); setYearMode('quick') }}
                  className={clsx(
                    'focus-ring px-4 py-2.5 rounded-xl border text-sm font-mono font-semibold transition-all duration-200',
                    form.year === String(y)
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.14] hover:text-white',
                  )}
                >
                  {y}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setYearMode('manual')}
                className="focus-ring px-4 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-sm font-mono text-muted hover:border-white/[0.2] hover:text-body transition-all duration-200"
              >
                Other…
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                className="field-input max-w-[140px]"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 2018"
                min={yearInputBounds.min}
                max={yearInputBounds.max}
                value={form.year}
                onChange={e => set('year', e.target.value)}
                autoFocus
              />
              <button type="button" onClick={() => setYearMode('quick')} className="focus-ring rounded-md text-muted text-sm hover:text-body transition-colors">
                ← Quick pick
              </button>
            </div>
          )}
          {/* min/max on the input above only keeps the spinner arrows in a
              sane range — it does NOT mean every year in between is valid
              (a gapped model like the Viper has real non-production years
              inside that span), so a typed year is checked against the
              actual discrete valid-years set here instead. */}
          {selectedModel && form.year && !isYearValid(form.year) && (
            <p className="font-mono text-xs text-amber-400 mt-2">
              {selectedModel.name} wasn't produced in {form.year} — see verified years below.
            </p>
          )}
          {selectedModel && (
            <p className="font-mono text-xs text-muted mt-2">
              Verified production years: {selectedModel.production_ranges
                .map(r => `${r.production_year_start}–${r.production_year_end ?? 'present'}`)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ── Confirmation chip ── */}
      {form.year && form.make && form.model && (
        <div className="mt-6 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3 bg-white/[0.05] border border-white/[0.12] rounded-2xl px-5 py-3 max-w-full">
            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            <span className="font-display font-bold text-white break-words">
              {form.year} {form.make} {form.model}
            </span>
            <button
              type="button"
              onClick={() => { set('year', ''); set('make', ''); set('model', '') }}
              aria-label="Change selected vehicle"
              className="focus-ring rounded-md text-muted hover:text-body transition-colors ml-1 font-mono text-xs"
            >
              change
            </button>
          </div>
        </div>
      )}

      {/* ── Controlled escape hatch — explicit opt-in, not a silent fallback ── */}
      {!makesLoading && (
        <button
          type="button"
          onClick={enterUnlisted}
          className="focus-ring rounded-md mt-6 text-muted text-sm hover:text-body transition-colors underline underline-offset-2 decoration-white/20"
        >
          My vehicle isn't listed
        </button>
      )}
    </div>
  )
}

/* ─── Main Planner ─── */

export default function Planner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [form,    setForm]    = useState({
    title: '', year: '', make: '', model: '',
    budget: '', goal: '', experience: 'intermediate',
    categories: [], is_daily: true, notes: '',
  })

  const set    = (field, val) => setForm(p => ({ ...p, [field]: val }))
  const toggle = (cat) => setForm(p => ({
    ...p,
    categories: p.categories.includes(cat)
      ? p.categories.filter(c => c !== cat)
      : [...p.categories, cat],
  }))

  // Fires whenever the wizard step changes — a user who fires step 1 but
  // never step 2 is a drop-off, visible directly as a funnel step gap once
  // this data is in PostHog. No separate "abandoned" event needed.
  useEffect(() => {
    analytics.capture('planner_step_viewed', { step_index: step, step_name: STEPS[step] })
  }, [step])

  // A distinct, one-time funnel-entry event — empty deps means this fires
  // once per mount, not once per step like planner_step_viewed above. Kept
  // separate rather than inferring "started" from step_index===0 so a
  // PostHog funnel can use this as its own unambiguous first step.
  useEffect(() => {
    analytics.capture('planner_started')
  }, [])

  // The make/model grid on step 0 is tall enough that picking a platform
  // often leaves the page scrolled well past the top — without resetting
  // on step change, the next step's content renders underneath the fixed
  // navbar/email-banner at whatever scroll position was left behind
  // (most visible on short mobile viewports, where that grid barely fits).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const canAdvance = () => {
    if (step === 0) return form.year && form.make && form.model
    if (step === 1) return form.budget > 0 && form.goal
    if (step === 2) return form.experience
    return true
  }

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const payload = {
        ...form,
        title:  form.title || `${form.year} ${form.make} ${form.model}`,
        year:   parseInt(form.year),
        budget: parseFloat(form.budget),
      }
      if (!user) {
        const plan = await plansApi.preview(payload)
        // plansApi.preview() runs the full generation inline and only
        // resolves once a real plan exists — accurate to fire here. The
        // authenticated path below is deliberately NOT paired with this
        // event: buildsApi.create() only enqueues generation (status
        // 'pending'), it resolves well before a plan actually exists, so
        // firing plan_generated there would be wrong, not just incomplete.
        analytics.capture('plan_generated', {
          year: payload.year, make: payload.make, model: payload.model,
          budget: payload.budget, goal: payload.goal, path: 'preview',
        })
        navigate('/plan/preview', { state: { plan, vehicle: { year: payload.year, make: payload.make, model: payload.model } } })
        return
      }
      const build = await buildsApi.create(payload)
      navigate(`/builds/${build.id}`)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const vehicleLabel = [form.year, form.make, form.model].filter(Boolean).join(' ')

  const REVIEW_ROWS = [
    ['Vehicle',     `${form.year} ${form.make} ${form.model}`],
    ['Budget',      `$${parseFloat(form.budget || 0).toLocaleString()}`],
    ['Goal',        form.goal],
    ['Experience',  form.experience],
    ['Use',         form.is_daily ? 'Daily Driver' : 'Project Car'],
    ['Focus Areas', form.categories.length ? form.categories.join(', ') : 'All categories'],
    ...(form.notes ? [['Notes', form.notes]] : []),
  ]

  return (
    <div className="page-shell min-h-screen relative">
      {loading && <BuildingOverlay vehicle={vehicleLabel} />}

      {/* Atmospheric background */}
      <div className="page-glow absolute top-0 inset-x-0 h-[32rem] pointer-events-none" />

      <div className="container-content py-16 max-w-[760px] relative z-10">
        <div className="mb-10">
          <p className="eyebrow mb-3">Build Configurator</p>
          <h1 className="font-display font-black text-white text-4xl tracking-tight mb-2">
            Build your car.
          </h1>
          <p className="text-body text-base">
            Choose your platform and goals. We'll build the rest.
          </p>
        </div>

        <StepBar current={step} />

        {/* ── Step 0: Platform ── */}
        {step === 0 && <VehicleSelector form={form} set={set} />}

        {/* ── Step 1: Budget & Goal ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
              What's your budget?
            </h2>
            <p className="text-body text-sm mb-8">And what are you trying to achieve with this build?</p>

            <div className="mb-8">
              <label className="field-label">Total Budget (USD)</label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">$</span>
                <input
                  className="field-input pl-8"
                  type="number"
                  inputMode="numeric"
                  placeholder="5,000"
                  min="1"
                  value={form.budget}
                  onChange={e => set('budget', e.target.value)}
                />
              </div>
              {form.budget && parseFloat(form.budget) < 500 && (
                <p className="mt-2 text-amber-400/80 text-xs font-mono flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l5 9H1l5-9z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/><path d="M6 5v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                  Under $500 limits your options significantly.
                </p>
              )}
            </div>

            <div>
              <label className="field-label mb-3">Build Goal</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => set('goal', g.value)}
                    className={clsx(
                      'text-left p-4 rounded-xl border transition-all duration-200',
                      form.goal === g.value
                        ? 'bg-accent/10 border-accent/40 text-white'
                        : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.15] hover:bg-elevated',
                    )}
                  >
                    <div className="font-display font-semibold text-sm mb-1 leading-snug">{g.label}</div>
                    <div className="text-xs text-muted leading-snug">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Preferences ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
              Tell us about yourself.
            </h2>
            <p className="text-body text-sm mb-8">This shapes the complexity of your build recommendations.</p>

            <div className="mb-8">
              <label className="field-label mb-3">Experience Level</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {EXPERIENCE_LEVELS.map(e => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => set('experience', e.value)}
                    className={clsx(
                      'text-left p-5 rounded-xl border transition-all duration-200',
                      form.experience === e.value
                        ? 'bg-accent/10 border-accent/40 text-white'
                        : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.15] hover:bg-elevated',
                    )}
                  >
                    <div className="font-display font-semibold text-sm mb-1.5">{e.label}</div>
                    <div className="text-xs text-muted leading-snug">{e.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="field-label mb-3">
                Focus Areas
                <span className="text-muted ml-1.5 normal-case tracking-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggle(c.value)}
                    className={clsx(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200',
                      form.categories.includes(c.value)
                        ? 'bg-accent/10 border-accent/40 text-accent'
                        : 'bg-surface border-white/[0.08] text-body hover:border-white/[0.18] hover:text-white',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="field-label mb-3">Vehicle Use</label>
              <div className="flex gap-2 max-w-xs">
                {[{ val: true, label: 'Daily Driver' }, { val: false, label: 'Project Car' }].map(({ val, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set('is_daily', val)}
                    className={clsx(
                      'flex-1 py-3 rounded-xl border text-sm font-display font-semibold transition-all duration-200',
                      form.is_daily === val
                        ? 'bg-accent/10 border-accent/40 text-white'
                        : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.15]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Notes <span className="text-muted normal-case tracking-normal">(optional)</span></label>
              <textarea
                className="field-textarea"
                rows={3}
                placeholder="Anything specific? 'Want 700whp' or 'Track days on Michelin Cup 2s'"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
              Looks good?
            </h2>
            <p className="text-body text-sm mb-8">Review your build spec before we generate your plan.</p>

            <div className="rounded-2xl overflow-hidden mb-6 border border-white/[0.07]">
              {REVIEW_ROWS.map(([k, v], i) => (
                <div
                  key={k}
                  className={clsx(
                    'flex flex-col md:flex-row md:items-start md:justify-between gap-1 md:gap-0 px-6 py-4 hover:bg-white/[0.02] transition-colors',
                    i < REVIEW_ROWS.length - 1 && 'border-b border-white/[0.05]',
                  )}
                >
                  <span className="font-mono text-xs text-muted uppercase tracking-wider md:pt-0.5">{k}</span>
                  <span className="text-white text-sm font-medium md:text-right md:max-w-[60%] capitalize">{v}</span>
                </div>
              ))}
            </div>

            {error && <Alert variant="error">{error}</Alert>}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between gap-4 mt-10 pt-8 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={() => setStep(p => p - 1)}
            disabled={step === 0}
            className="tap-target md:min-h-0 md:min-w-0 inline-flex items-center gap-2 px-3 -ml-3 rounded-xl text-body text-sm font-medium hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {step < 3 ? (
            <Button
              size="lg"
              onClick={() => {
                if (step === 0) {
                  analytics.capture('vehicle_submitted', { year: form.year, make: form.make, model: form.model })
                }
                setStep(p => p + 1)
              }}
              disabled={!canAdvance()}
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          ) : (
            <Button size="xl" onClick={submit} loading={loading} className="shadow-glow">
              Build My Garage
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
