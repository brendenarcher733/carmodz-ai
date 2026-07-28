import { useEffect } from 'react'
import { VehicleVisualConfigurator } from '../vehicle-visual/VehicleVisualConfigurator'
import { ConfigPanel } from '../configurator/ConfigPanel'
import { BuildSummary } from '../configurator/BuildSummary'
import { useCarConfig } from '../../hooks/useCarConfig'
import * as analytics from '../../services/analytics'

/* The 2D photo-layer visual configurator (VehicleVisualConfigurator/
   ConfigPanel/BuildSummary/useCarConfig, all unmodified from
   pages/Configurator.jsx's own usage) pre-loaded with a hardcoded default
   vehicle instead of a build's real make/model/year, so a brand-new
   anonymous visitor can start repainting a car in the first few seconds on
   the site — no signup, no query params, no saved build required (none of
   these four components have any backend/auth dependency).

   This is the SECOND thing a visitor sees on the homepage, not the first —
   Landing.jsx renders a text-only headline section above this one, with no
   vehicle graphic of any kind, per an explicit later revision to the
   original "configurator is the front door" plan.

   "Mustang GT" is a deliberate choice, not arbitrary: it's the one vehicle
   with a real (currently placeholder) asset catalog entry in
   data/vehicleCatalog.js — see that file for why this is a deliberately
   curated, closed list rather than "any car."

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
    <section className="relative min-h-[85vh] flex flex-col overflow-hidden">
      {/* The configurator itself */}
      <div className="container-content py-12 md:py-16 relative z-10 flex-1 min-h-0">
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
            <VehicleVisualConfigurator
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
