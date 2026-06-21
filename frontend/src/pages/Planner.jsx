import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildsApi } from '../services/api'
import clsx from 'clsx'

/* ─── Vehicle data ─── */

const MAKE_GROUPS = [
  {
    label: 'Supercars & Exotics',
    makes: ['Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Bugatti', 'Koenigsegg', 'Pagani', 'Rimac'],
  },
  {
    label: 'European Premium',
    makes: ['Porsche', 'Jaguar', 'Bentley', 'Rolls-Royce', 'Maserati', 'Alfa Romeo', 'Lotus'],
  },
  {
    label: 'German',
    makes: ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen'],
  },
  {
    label: 'American',
    makes: ['Ford', 'Chevrolet', 'Dodge', 'Cadillac', 'Jeep', 'Ram', 'Tesla'],
  },
  {
    label: 'Japanese',
    makes: ['Toyota', 'Honda', 'Nissan', 'Subaru', 'Mazda', 'Mitsubishi', 'Lexus', 'Acura', 'Infiniti'],
  },
  {
    label: 'Korean & Other',
    makes: ['Hyundai', 'Kia', 'Genesis', 'Land Rover', 'Volvo', 'MINI'],
  },
]

const ALL_MAKES = MAKE_GROUPS.flatMap(g => g.makes)

const MODELS = {
  // ── Supercars & Exotics ──────────────────────────────────────────────────────
  Ferrari: [
    '488 GTB', '488 Pista', 'F8 Tributo', 'F8 Spider', 'SF90 Stradale', 'SF90 XX',
    '296 GTB', '296 GTS', 'Roma', 'Roma Spider', 'Portofino M',
    '812 Superfast', '812 GTS', 'GTC4Lusso',
    '430 Scuderia', '458 Italia', '458 Speciale', '360 Modena', '360 Challenge Stradale',
    '599 GTO', 'F430', 'Enzo', 'LaFerrari',
  ],
  Lamborghini: [
    'Huracán EVO', 'Huracán EVO Spyder', 'Huracán STO', 'Huracán Tecnica',
    'Urus', 'Urus Performante', 'Urus S',
    'Aventador S', 'Aventador SVJ', 'Aventador Ultimae', 'Revuelto',
    'Gallardo LP570-4 Superleggera', 'Murciélago LP670-4 SuperVeloce', 'Sesto Elemento',
  ],
  McLaren: [
    '720S', '720S Spider', '750S', '750S Spider',
    '765LT', '765LT Spider', '570S', '570GT', '600LT',
    'Artura', 'Artura Spider', 'GT',
    'Senna', 'Speedtail', '675LT', '650S', 'P1',
  ],
  'Aston Martin': [
    'DB11', 'DB11 AMR', 'DB11 Volante',
    'DBX', 'DBX707',
    'Vantage', 'Vantage Roadster', 'Vantage F1 Edition',
    'DBS Superleggera', 'DBS 770 Ultimate',
    'Valkyrie', 'Valour', 'Vanquish S', 'DB9 GT', 'V8 Vantage GT4',
  ],
  Bugatti: [
    'Chiron', 'Chiron Sport', 'Chiron Super Sport 300+', 'Chiron Pur Sport',
    'Divo', 'Bolide', 'Tourbillon',
    'Veyron 16.4', 'Veyron Super Sport',
  ],
  Koenigsegg: [
    'Jesko', 'Jesko Absolut', 'Regera', 'CC850',
    'Agera RS', 'One:1', 'Gemera', 'CCX',
  ],
  Pagani: [
    'Huayra', 'Huayra R', 'Huayra BC', 'Huayra Roadster BC',
    'Utopia', 'Zonda Cinque', 'Zonda R',
  ],
  Rimac: [
    'Nevera', 'Nevera R', 'Concept_One',
  ],

  // ── European Premium ─────────────────────────────────────────────────────────
  Porsche: [
    '911 Carrera', '911 Carrera 4S', '911 GT3', '911 GT3 RS', '911 GT3 Touring', '911 Turbo S',
    '718 Cayman GT4 RS', '718 Boxster Spyder', '718 Cayman', '718 GTS 4.0',
    'Cayenne Turbo GT', 'Panamera Turbo S', 'Macan GTS',
  ],
  Jaguar: [
    'F-Type', 'F-Type R', 'F-Type P450', 'F-Type SVR',
    'F-Pace SVR', 'F-Pace P400e', 'E-Pace',
    'XE SV Project 8', 'XKR-S', 'XK', 'XFR-S',
  ],
  Bentley: [
    'Continental GT Speed', 'Continental GT V8', 'Continental GT Mulliner',
    'Continental GTC Speed', 'Flying Spur Speed', 'Flying Spur Mulliner',
    'Bentayga Speed', 'Bentayga EWB', 'Mulliner Batur',
    'Continental GT3-R', 'Supersports',
  ],
  'Rolls-Royce': [
    'Ghost', 'Ghost Extended', 'Spectre', 'Cullinan', 'Cullinan Series II',
    'Phantom', 'Phantom VIII', 'Wraith', 'Dawn', 'Black Badge Wraith',
  ],
  Maserati: [
    'GranTurismo', 'GranTurismo Folgore', 'GranTurismo Trofeo',
    'MC20', 'MC20 Cielo',
    'Grecale Trofeo', 'Ghibli Trofeo', 'Levante Trofeo', 'Quattroporte Trofeo',
    '4200 GT', 'GranSport',
  ],
  'Alfa Romeo': [
    'Giulia Quadrifoglio', 'Giulia GTA', 'Giulia Sprint',
    'Stelvio Quadrifoglio', 'Stelvio Veloce',
    '4C Spider', '33 Stradale', 'GTV', '156 GTA',
  ],
  Lotus: [
    'Emira V6 First Edition', 'Emira i4 First Edition',
    'Evija', 'Emeya',
    'Exige Sport 410', 'Exige Cup 430', 'Elise Cup 250', 'Elise Sport 220',
    'Evora GT', '3-Eleven', 'Esprit V8',
  ],

  // ── German ───────────────────────────────────────────────────────────────────
  BMW: [
    'M2', 'M2 CS', 'M3', 'M3 CS', 'M3 Competition', 'M3 Touring',
    'M4', 'M4 CS', 'M4 GTS', 'M4 Competition Convertible',
    'M5', 'M5 CS', 'M5 Competition', 'M8 Competition',
    'M1000RR (Concept)', '1M Coupe', '2 Series Gran Coupe',
    'X5 M Competition', 'X6 M Competition',
  ],
  'Mercedes-Benz': [
    'AMG GT Black Series', 'AMG GT R Pro', 'AMG GT S', 'AMG GT 63 S',
    'AMG C63 S', 'AMG C63 SE Performance', 'AMG A45 S', 'AMG CLA45 S',
    'AMG E63 S', 'AMG S63', 'AMG GLE63 S', 'AMG G63',
    'AMG SL 55', 'AMG SL 63', 'AMG SLS', 'AMG One',
    'C-Class', 'E-Class', 'S-Class', 'G-Class',
  ],
  Audi: [
    'RS3', 'RS3 Sportback', 'S3', 'TT RS', 'TT',
    'RS4 Avant', 'RS5', 'RS5 Sportback', 'S4', 'S5',
    'RS6 Avant', 'RS7 Sportback', 'RS Q8', 'SQ8',
    'R8 V10 Performance', 'R8 GT', 'e-tron GT RS',
    'A4', 'A6', 'Q5', 'Q7', 'Q8',
  ],
  Volkswagen: [
    'Golf GTI', 'Golf R', 'Golf R 20 Years', 'Golf GTD',
    'Jetta GLI', 'Arteon R', 'Touareg R', 'T-Roc R',
    'Polo GTI', 'ID.4 GTX', 'Tiguan R',
  ],

  // ── American ─────────────────────────────────────────────────────────────────
  Ford: [
    'Mustang GT', 'Mustang GT500', 'Mustang Dark Horse', 'Mustang Mach 1',
    'Mustang EcoBoost HP', 'GT350', 'GT350R', 'Mustang Bullitt',
    'F-150 Raptor', 'F-150 Raptor R', 'F-150 Lightning Pro',
    'Bronco Raptor', 'Bronco Wildtrak', 'Focus RS', 'Fiesta ST',
  ],
  Chevrolet: [
    'Corvette Stingray', 'Corvette Z06', 'Corvette ZR1', 'Corvette E-Ray',
    'Camaro SS', 'Camaro ZL1', 'Camaro 1LE', 'Camaro ZL1 1LE',
    'Colorado ZR2', 'Silverado Trail Boss', 'Silverado 1500 LTZ',
    'Tahoe RST', 'Blazer RS',
  ],
  Dodge: [
    'Challenger SRT Hellcat', 'Challenger SRT Hellcat Redeye', 'Challenger SRT Demon 170',
    'Challenger SRT Super Stock', 'Charger SRT Hellcat', 'Charger SRT Hellcat Redeye',
    'Viper ACR', 'Viper GTC', 'Durango SRT 392',
  ],
  Cadillac: [
    'CT5-V Blackwing', 'CT4-V Blackwing', 'CT5-V', 'CT4-V',
    'Escalade V', 'Escalade', 'XT6',
    'CTS-V Wagon', 'ATS-V', 'XLR-V',
  ],
  Jeep: [
    'Wrangler Rubicon 392', 'Wrangler Rubicon', 'Wrangler Sahara 4xe',
    'Grand Cherokee Trackhawk', 'Grand Cherokee SRT', 'Grand Cherokee 4xe',
    'Gladiator Mojave', 'Gladiator Rubicon',
  ],
  Ram: [
    'RAM 1500 TRX', 'RAM 1500 Rebel', 'RAM 2500 Power Wagon',
    'RAM 3500 Limited Longhorn', 'TRX Launch Edition',
  ],
  Tesla: [
    'Model S Plaid', 'Model S Long Range', 'Model 3 Performance',
    'Model X Plaid', 'Model Y Performance', 'Model Y Long Range',
    'Roadster', 'Cybertruck Cyberbeast',
  ],

  // ── Japanese ─────────────────────────────────────────────────────────────────
  Toyota: [
    'GR Supra A91 MT', 'GR Supra 3.0', 'GR86', 'GR Corolla Circuit Edition',
    'GR Corolla', 'Camry TRD', 'Corolla GR Sport', '86',
    '4Runner TRD Pro', 'Tacoma TRD Pro', 'Tundra TRD Pro', 'Sequoia TRD Pro',
    'Land Cruiser 300 GR Sport',
  ],
  Honda: [
    'Civic Type R', 'Civic Si', 'Civic Sport', 'Integra Type S',
    'Accord Sport', 'NSX Type S', 'S2000 CR', 'S2000 Club Racer',
    'CR-Z', 'Fit RS', 'Fit GK5 RS (JDM)', 'HR-V Sport',
  ],
  Nissan: [
    'GT-R Nismo', 'GT-R Track Edition', 'GT-R Premium',
    '370Z Nismo', '370Z', '350Z Track', '240SX',
    'Ariya e-4orce', 'Frontier PRO-4X', 'Armada', 'Sentra SR Turbo',
  ],
  Subaru: [
    'WRX STI S209', 'WRX STI Type RA', 'WRX STI', 'WRX',
    'BRZ tS', 'BRZ Limited', 'Forester XT', 'Impreza WRX',
    'Outback XT', 'Crosstrek Sport', 'Levorg STI Sport',
  ],
  Mazda: [
    'MX-5 RF', 'MX-5 Club', 'MX-5 Grand Touring RS',
    'RX-7 FD3S', 'RX-7 FC3S', 'RX-8 R3',
    'Mazdaspeed3', 'Mazdaspeed6', 'CX-5 Turbo', 'Mazda3 Turbo',
  ],
  Mitsubishi: [
    'Lancer Evolution X MR', 'Lancer Evolution X GSR',
    'Lancer Evo IX MR', 'Lancer Evo VI TME',
    'Eclipse GSX', '3000GT VR-4', '3000GT SL',
    'Galant VR-4', 'Starion ESi-R',
  ],
  Lexus: [
    'LFA', 'LC 500 Inspiration', 'LC 500',
    'RC F Track Edition', 'RC F', 'IS 500 F Sport Performance', 'IS 350 F Sport',
    'GS F', 'LS 500h', 'LX 600 F Sport', 'GX 550 Premium Plus',
  ],
  Acura: [
    'NSX Type S', 'NSX', 'Integra Type S', 'TLX Type S A-Spec',
    'MDX Type S Advance', 'RDX A-Spec Advance', 'RSX Type-S', 'TSX',
  ],
  Infiniti: [
    'Q50 Red Sport 400', 'Q50 RS400', 'Q60 Project Black S', 'Q60 Red Sport 400',
    'G37 S Coupe', 'G35 Coupe 6MT', 'FX50 S', 'QX80',
  ],

  // ── Korean & Other ───────────────────────────────────────────────────────────
  Hyundai: [
    'Elantra N', 'Elantra N Line', 'Veloster N Performance Package',
    'Sonata N-Line', 'Tucson N', 'Ioniq 5 N', 'Ioniq 6 N',
    'i30 N Project C', 'i20 N',
  ],
  Kia: [
    'Stinger GT2 V6', 'Stinger 400 GT', 'K5 GT', 'EV6 GT',
    'Forte GT', 'ProCeed GT', 'Ceed GT',
  ],
  Genesis: [
    'G70 3.3T Sport', 'G70.4e', 'G80 Sport 3.5T', 'G90 Sport',
    'GV70 Sport 3.5T', 'GV80 Coupe 3.5T',
  ],
  'Land Rover': [
    'Range Rover Sport SVR', 'Range Rover Sport SV', 'Range Rover SV Autobiography',
    'Defender 110 V8', 'Defender 90 V8 Carpathian', 'Discovery SVX', 'Discovery 4',
    'Freelander 2 SD4',
  ],
  Volvo: [
    'S60 Polestar Engineered', 'V60 Polestar Engineered', 'XC60 T8 R-Design',
    'XC90 T8 Excellence', 'C40 Recharge', 'EX90 Twin Motor Performance',
  ],
  MINI: [
    'Cooper S JCW GP', 'Cooper S Works', 'John Cooper Works',
    'Countryman JCW ALL4', 'Clubman JCW ALL4', 'Cooper SE',
    'Paceman S ALL4', 'Coupe JCW',
  ],
}

// Quick year picks — current year down 6, plus a wider manual option
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
  const [yearMode, setYearMode] = useState('quick')
  const [search, setSearch]     = useState('')

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return MAKE_GROUPS
    const q = search.toLowerCase()
    return MAKE_GROUPS
      .map(g => ({ ...g, makes: g.makes.filter(m => m.toLowerCase().includes(q)) }))
      .filter(g => g.makes.length > 0)
  }, [search])

  const selectedModels = form.make ? (MODELS[form.make] || []) : []

  const selectMake = (make) => {
    set('make', make)
    set('model', '')
    setSearch('')
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display font-black text-white text-2xl tracking-tight mb-2">
        Pick your platform.
      </h2>
      <p className="text-body text-sm mb-8">40+ manufacturers — supercars, JDM, muscle, and everything in between.</p>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          className="field-input pl-9 text-sm"
          placeholder="Search makes — Ferrari, Lamborghini, Supra…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-body"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Make groups ── */}
      <div className="mb-8 space-y-5">
        {filteredGroups.map(group => (
          <div key={group.label}>
            <p className="font-mono text-[10px] text-muted uppercase tracking-[0.14em] mb-2 px-0.5">
              {group.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {group.makes.map(make => (
                <button
                  key={make}
                  type="button"
                  onClick={() => selectMake(make)}
                  className={clsx(
                    'px-3 py-2.5 rounded-xl border text-sm font-display font-semibold transition-all duration-150 text-left leading-tight',
                    form.make === make
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-surface border-white/[0.07] text-body hover:border-white/[0.18] hover:text-white',
                  )}
                >
                  {make}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Custom make fallback */}
        {filteredGroups.length === 0 && (
          <div>
            <p className="text-muted text-sm mb-3">No match — enter manually:</p>
            <input
              className="field-input text-sm"
              placeholder="Type make name…"
              value={search}
              onChange={e => { setSearch(e.target.value); selectMake(e.target.value) }}
            />
          </div>
        )}
      </div>

      {/* ── Model grid ── */}
      {form.make && selectedModels.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <label className="field-label mb-3">Model <span className="text-accent">·</span> {form.make}</label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {selectedModels.map(model => (
              <button
                key={model}
                type="button"
                onClick={() => set('model', model)}
                className={clsx(
                  'px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left leading-snug',
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

      {/* Make typed manually (no model list) */}
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

      {/* ── Year ── */}
      {form.make && form.model && (
        <div className="animate-fade-in">
          <label className="field-label mb-3">Year</label>
          {yearMode === 'quick' ? (
            <div className="flex flex-wrap gap-2">
              {QUICK_YEARS.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { set('year', String(y)); setYearMode('quick') }}
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
              <button type="button" onClick={() => setYearMode('quick')} className="text-muted text-sm hover:text-body transition-colors">
                ← Quick pick
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation chip ── */}
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
                <span className="text-muted ml-1.5 normal-case tracking-normal">(optional)</span>
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
