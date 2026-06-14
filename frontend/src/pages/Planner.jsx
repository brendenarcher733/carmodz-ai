import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildsApi } from '../services/api'
import clsx from 'clsx'

/* ─── Vehicle data ─── */

const MAKES = [
  'Toyota', 'Subaru', 'Honda', 'BMW',
  'Nissan', 'Ford', 'Mazda', 'Audi',
  'Chevrolet', 'Volkswagen', 'Mitsubishi', 'Porsche',
  'Hyundai', 'Kia', 'Dodge', 'Mercedes',
]

const MODELS = {
  Toyota:     ['Supra', 'GR86', 'GR Corolla', 'Camry TRD', '86', '4Runner', 'Tacoma', 'Tundra TRD', 'Corolla'],
  Subaru:     ['WRX', 'WRX STI', 'BRZ', 'Forester XT', 'Impreza', 'Outback', 'Crosstrek'],
  Honda:      ['Civic Si', 'Civic Type R', 'Accord', 'Integra', 'CR-Z', 'S2000', 'Fit'],
  BMW:        ['M2', 'M3', 'M4', 'M5', '3 Series', '2 Series', '1M', 'X5 M'],
  Nissan:     ['370Z', '350Z', 'GT-R', 'Altima', 'Frontier PRO-4X', 'Armada'],
  Ford:       ['Mustang GT', 'Mustang GT500', 'Focus RS', 'Fiesta ST', 'F-150 Raptor', 'Bronco'],
  Mazda:      ['MX-5 Miata', 'RX-8', 'Mazdaspeed3', 'Mazda3', 'CX-5', 'MX-30'],
  Audi:       ['RS3', 'S3', 'TT', 'A4', 'S4', 'RS5', 'R8'],
  Chevrolet:  ['Camaro SS', 'Camaro ZL1', 'Corvette Stingray', 'Corvette Z06', 'Colorado ZR2'],
  Volkswagen: ['GTI', 'Golf R', 'Jetta GLI', 'Passat', 'Arteon'],
  Mitsubishi: ['Lancer Evo', 'Eclipse', '3000GT', 'Outlander', 'Eclipse Cross'],
  Porsche:    ['911 Carrera', '911 GT3', 'Cayman GT4', 'Boxster', 'Macan GTS'],
  Hyundai:    ['Elantra N', 'Veloster N', 'Sonata N-Line', 'Tucson N', 'Ioniq 5 N'],
  Kia:        ['Stinger GT', 'K5 GT', 'EV6 GT', 'Forte GT'],
  Dodge:      ['Challenger', 'Charger', 'Viper', 'Durango SRT'],
  Mercedes:   ['AMG C63', 'AMG A45', 'AMG E63', 'C-Class', 'GLA45'],
}

// Quick year picks — current year down 6
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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,140,0,0.07) 0%, transparent 65%)' }}
      />
      <div className="relative text-center max-w-sm px-8">
        <div className="relative w-20 h-20 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border border-accent/30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 rounded-full border border-accent/20 animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="font-display font-black text-white text-2xl mb-2 tracking-tight">Building Your Garage</h2>
        {vehicle && <p className="font-mono text-xs text-muted uppercase tracking-widest mb-5">{vehicle}</p>}
        <p key={idx} className="text-body text-sm leading-relaxed animate-fade-in">{LOADING_MSGS[idx]}</p>
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent/40"
              style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Step bar ─── */

function StepBar({ current }) {
  return (
    <div className="flex items-center mb-12">
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all duration-300',
                done   && 'bg-accent text-obsidian',
                active && 'bg-accent text-obsidian shadow-glow-sm',
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
              <div className="flex-1 h-px mx-2 transition-all duration-300"
                style={{ background: done ? '#FF8C00' : 'rgba(255,255,255,0.07)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step 0: Vehicle Platform Selector ─── */

function VehicleSelector({ form, set }) {
  const [yearMode, setYearMode] = useState('quick') // 'quick' | 'manual'
  const selectedModels = form.make ? (MODELS[form.make] || []) : []

  const selectMake = (make) => {
    set('make', make)
    set('model', '')   // reset model when make changes
  }

  const selectModel = (model) => set('model', model)

  const selectYear = (year) => {
    set('year', String(year))
    setYearMode('quick')
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
        Pick your platform.
      </h2>
      <p className="text-body text-sm mb-8">Choose your make, then your model.</p>

      {/* ── Make grid ── */}
      <div className="mb-8">
        <label className="field-label mb-3">Make</label>
        <div className="grid grid-cols-4 gap-2">
          {MAKES.map(make => (
            <button
              key={make}
              type="button"
              onClick={() => selectMake(make)}
              className={clsx(
                'px-3 py-3 rounded-xl border text-sm font-display font-semibold transition-all duration-150 text-left',
                form.make === make
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.18] hover:text-white',
              )}
            >
              {make}
            </button>
          ))}
        </div>

        {/* Custom make fallback */}
        {!MAKES.includes(form.make) || form.make === '' ? (
          <div className="mt-3">
            <input
              className="field-input text-sm"
              placeholder="Other make (type here)…"
              value={MAKES.includes(form.make) ? '' : form.make}
              onChange={e => selectMake(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {/* ── Model grid — appears after make is chosen ── */}
      {form.make && selectedModels.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <label className="field-label mb-3">Model <span className="text-accent">·</span> {form.make}</label>
          <div className="grid grid-cols-3 gap-2">
            {selectedModels.map(model => (
              <button
                key={model}
                type="button"
                onClick={() => selectModel(model)}
                className={clsx(
                  'px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 text-left',
                  form.model === model
                    ? 'bg-accent/10 border-accent/40 text-white'
                    : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.14] hover:text-white',
                )}
              >
                {model}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <input
              className="field-input text-sm"
              placeholder={`Other ${form.make} model…`}
              value={selectedModels.includes(form.model) ? '' : form.model}
              onChange={e => set('model', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* If make typed but not in list */}
      {form.make && !MODELS[form.make] && (
        <div className="mb-8">
          <label className="field-label mb-3">Model</label>
          <input
            className="field-input"
            placeholder={`${form.make} model…`}
            value={form.model}
            onChange={e => set('model', e.target.value)}
          />
        </div>
      )}

      {/* ── Year — appears after model chosen ── */}
      {form.make && form.model && (
        <div className="animate-fade-in">
          <label className="field-label mb-3">Year</label>
          {yearMode === 'quick' ? (
            <div className="flex flex-wrap gap-2">
              {QUICK_YEARS.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => selectYear(y)}
                  className={clsx(
                    'px-4 py-2.5 rounded-xl border text-sm font-mono font-semibold transition-all duration-150',
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
                className="px-4 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-sm font-mono text-muted hover:border-white/[0.2] hover:text-body transition-all duration-150"
              >
                Other…
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                className="field-input max-w-[140px]"
                type="number"
                placeholder="e.g. 2018"
                min="1950"
                max={CURRENT_YEAR + 1}
                value={form.year}
                onChange={e => set('year', e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setYearMode('quick')}
                className="text-muted text-sm hover:text-body transition-colors"
              >
                ← Quick pick
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Selected vehicle confirmation chip ── */}
      {form.year && form.make && form.model && (
        <div className="mt-6 animate-fade-in">
          <div className="inline-flex items-center gap-3 bg-accent/[0.08] border border-accent/25 rounded-2xl px-5 py-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-display font-bold text-white">
              {form.year} {form.make} {form.model}
            </span>
            <button
              type="button"
              onClick={() => { set('year', ''); set('make', ''); set('model', '') }}
              className="text-muted hover:text-body transition-colors ml-1 font-mono text-xs"
            >
              change
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Planner ─── */

export default function Planner() {
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
      const build = await buildsApi.create(payload)
      navigate(`/builds/${build.id}`)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const vehicleLabel = [form.year, form.make, form.model].filter(Boolean).join(' ')

  const REVIEW_ROWS = [
    ['Vehicle',    `${form.year} ${form.make} ${form.model}`],
    ['Budget',     `$${parseFloat(form.budget || 0).toLocaleString()}`],
    ['Goal',       form.goal],
    ['Experience', form.experience],
    ['Use',        form.is_daily ? 'Daily Driver' : 'Project Car'],
    ['Focus Areas', form.categories.length ? form.categories.join(', ') : 'All categories'],
    ...(form.notes ? [['Notes', form.notes]] : []),
  ]

  return (
    <div className="page-shell min-h-screen relative">
      {loading && <BuildingOverlay vehicle={vehicleLabel} />}

      {/* Atmospheric background */}
      <div
        className="absolute top-0 inset-x-0 h-72 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to bottom,
              rgba(8,9,11,0.65) 0%,
              rgba(8,9,11,0.88) 55%,
              rgba(8,9,11,1)    100%
            ),
            url('https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1920&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      />

      <div className="container-content py-16 max-w-[760px] relative z-10">

        {/* Page header */}
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
                      'text-left p-4 rounded-xl border transition-all duration-150',
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
              <div className="grid grid-cols-3 gap-3">
                {EXPERIENCE_LEVELS.map(e => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => set('experience', e.value)}
                    className={clsx(
                      'text-left p-5 rounded-xl border transition-all duration-150',
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
                <span className="text-muted ml-1.5 normal-case tracking-normal">(optional — all if none selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggle(c.value)}
                    className={clsx(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150',
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
                      'flex-1 py-3 rounded-xl border text-sm font-display font-semibold transition-all duration-150',
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
                placeholder="Anything specific? 'Want 400whp eventually' or 'Only highway driving'"
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

            <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              {REVIEW_ROWS.map(([k, v], i) => (
                <div
                  key={k}
                  className="flex items-start justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  style={i < REVIEW_ROWS.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : undefined}
                >
                  <span className="font-mono text-xs text-muted uppercase tracking-wider pt-0.5">{k}</span>
                  <span className="text-white text-sm font-medium text-right max-w-[60%] capitalize">{v}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-4 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <div
          className="flex items-center justify-between mt-10 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <button
            type="button"
            onClick={() => setStep(p => p - 1)}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-body text-sm font-medium hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(p => p + 1)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-bold text-sm px-7 py-3 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-base px-8 py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <span className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />}
              Build My Garage
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
