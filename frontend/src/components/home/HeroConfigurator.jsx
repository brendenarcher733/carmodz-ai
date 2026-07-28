import { useEffect } from 'react'
import { CarScene } from '../configurator/CarScene'
import { ConfigPanel } from '../configurator/ConfigPanel'
import { BuildSummary } from '../configurator/BuildSummary'
import { useCarConfig } from '../../hooks/useCarConfig'
import * as analytics from '../../services/analytics'

/* The homepage's front door — the real 3D Configurator (CarScene/
   ConfigPanel/BuildSummary/useCarConfig, all unmodified, same components
   pages/Configurator.jsx uses) pre-loaded with a hardcoded default vehicle
   instead of a build's real make/model/year, so a brand-new anonymous
   visitor can start orbiting and repainting a car in the first second on
   the site — no signup, no query params, no saved build required (none of
   these four components have any backend/auth dependency to begin with).

   "Mustang GT" is a deliberate choice, not arbitrary: it matches
   lib/vehicleUtils.js's `muscle` classification pattern, so it resolves to
   a real, correctly-matched 3D model rather than classifyVehicle's generic
   empty-string catch-all (what pages/Configurator.jsx itself falls back to
   when no query params are present at all).

   BuildSummary already ships its own "Get Expert Advice" (-> /advisor) and
   "New Build" (-> /planner) buttons — reused here as-is, which is exactly
   the "chat/planner reachable from the configurator, not the front door"
   requirement, with zero new CTA code needed. */

const DEFAULT_VEHICLE = { make: 'Ford', model: 'Mustang GT', year: '2020' }
const DEFAULT_VEHICLE_NAME = `${DEFAULT_VEHICLE.year} ${DEFAULT_VEHICLE.make} ${DEFAULT_VEHICLE.model}`

export function HeroConfigurator() {
  useEffect(() => { analytics.capture('hero_configurator_viewed') }, [])

  const { config, setSingle, toggleMulti, setCustomColor, summary } = useCarConfig()

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Atmospheric backdrop — same recipe as the rest of the app's page glows */}
      <div className="page-glow absolute top-0 inset-x-0 h-[36rem] pointer-events-none" />

      {/* Intro copy */}
      <div className="container-content pt-28 md:pt-32 pb-6 md:pb-8 relative z-10 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.1] text-body text-xs font-semibold tracking-[0.14em] uppercase px-4 py-2 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Try it — no signup
        </div>
        <h1
          className="animate-fade-up anim-delay-1 font-display font-black text-white leading-[0.98] tracking-[-0.03em] mb-4"
          style={{ fontSize: 'clamp(2rem, 4.4vw, 3.2rem)' }}
        >
          Build your dream <span className="text-accent">{DEFAULT_VEHICLE.make} {DEFAULT_VEHICLE.model}</span> right now.
        </h1>
        <p className="animate-fade-up anim-delay-2 text-body text-base md:text-lg max-w-xl mx-auto">
          Paint, wheels, tint, real mods — drag to orbit, watch the price add up live.
          This is the real tool, working right now. Your own car takes about 60 seconds
          in the planner below.
        </p>
      </div>

      {/* The configurator itself */}
      <div className="container-content pb-12 md:pb-16 relative z-10 flex-1 min-h-0">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-full">
          <div className="md:w-64 flex-shrink-0 rounded-2xl overflow-hidden border border-white/[0.07]" style={{ height: 300 }}>
            <ConfigPanel
              config={config}
              setSingle={setSingle}
              toggleMulti={toggleMulti}
              setCustomColor={setCustomColor}
            />
          </div>

          <div className="flex-1 min-w-0 rounded-2xl overflow-hidden border border-white/[0.07]" style={{ height: 380 }}>
            <CarScene
              config={config}
              make={DEFAULT_VEHICLE.make}
              model={DEFAULT_VEHICLE.model}
              year={DEFAULT_VEHICLE.year}
            />
          </div>

          <div className="md:w-72 flex-shrink-0 rounded-2xl overflow-hidden border border-white/[0.07]" style={{ height: 380 }}>
            <BuildSummary summary={summary} vehicleName={DEFAULT_VEHICLE_NAME} />
          </div>
        </div>
      </div>
    </section>
  )
}
