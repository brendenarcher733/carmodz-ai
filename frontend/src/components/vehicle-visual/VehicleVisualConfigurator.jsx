import { findSupportedVehicle } from '../../data/vehicleCatalog'
import { MODIFICATIONS } from '../../data/modifications'

/* Replaces the old CarScene (3D/WebGL) render target with a layered-image
   compositor — real photos/renders swapped and stacked based on the exact
   same `config` shape useCarConfig() already produced (paint/tint/wheels/
   customColor), no change to ConfigPanel/BuildSummary/useCarConfig at all.

   Every image referenced by data/vehicleCatalog.js today is an obviously-
   fake placeholder (see public/vehicles/mustang-gt-2020/ — labeled, tinted
   SVG stand-ins, not photos) — this component doesn't know or care whether
   a path points at a placeholder or a real photo, so swapping in real
   assets later is a file-replace in the catalog, not a code change here.

   Unsupported vehicle = no image, ever, and never the old 3D fallback —
   just a plain "coming soon" notice. That's a deliberate product decision,
   not a missing feature: see data/vehicleCatalog.js's file comment for why
   a generic neutral-color photo isn't the fallback either (it would need
   its own real asset per unsupported vehicle, quietly re-creating the
   "support any car" problem this catalog exists to avoid). */

function ComingSoon({ make, model, year }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-panel border border-white/[0.07] rounded-2xl px-6 text-center">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-muted">
        <rect x="3" y="7" width="22" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 11h22" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="9" cy="9" r="0.9" fill="currentColor"/>
        <circle cx="12.5" cy="9" r="0.9" fill="currentColor"/>
      </svg>
      <p className="font-display font-semibold text-white text-sm">
        Visual preview coming soon for this vehicle
      </p>
      <p className="font-mono text-xs text-muted max-w-xs">
        {year} {make} {model} isn't in the visual configurator's supported list yet —
        your build plan below is unaffected.
      </p>
    </div>
  )
}

export function VehicleVisualConfigurator({ make, model, year, config }) {
  const vehicle = findSupportedVehicle(make, model, year)

  if (!vehicle) {
    return <ComingSoon make={make} model={model} year={year} />
  }

  const paintOpt = MODIFICATIONS.paint.options.find(o => o.id === config.paint)
  const tintOpt  = MODIFICATIONS.tint.options.find(o => o.id === config.tint) ?? MODIFICATIONS.tint.options[0]

  // Photo exists for this exact paint id -> use it directly. Otherwise
  // (a named color with no photo yet, or the free-hex custom picker) ->
  // show the catalog's default-color photo with a CSS tint approximating
  // the real selection, clearly an approximation rather than a fake photo.
  const hasRealPhoto = Boolean(vehicle.colors[config.paint])
  const bodyImage = hasRealPhoto ? vehicle.colors[config.paint] : vehicle.colors[vehicle.defaultColorId]
  const approximationHex = config.paint === 'customColor' ? config.customColor : paintOpt?.color

  const wheelOverlay = config.wheels !== 'stock' ? vehicle.wheelOverlays[config.wheels] : null

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-panel border border-white/[0.07]">
      {/* Base body photo */}
      <img src={bodyImage} alt={vehicle.label} className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" draggable={false} />

      {/* Color approximation overlay — only shown when there's no real photo
          for the exact selected paint id. Genuinely an approximation, not a
          disguised fake photo: a flat tint over the default-color body. */}
      {!hasRealPhoto && approximationHex && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: approximationHex, mixBlendMode: 'multiply', opacity: 0.55 }}
        />
      )}

      {/* Wheel overlay — skipped entirely for 'stock', since the base photos
          already show the car on its factory wheels. */}
      {wheelOverlay && (
        <img src={wheelOverlay} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" draggable={false} />
      )}

      {/* Tint darkness — one glass-area mask, opacity driven by the selected
          tint level's glassOpacity (same value the old 3D material used). */}
      <img
        src={vehicle.glassMask}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
        style={{ opacity: tintOpt.glassOpacity }}
        draggable={false}
      />

      {!hasRealPhoto && (
        <div className="absolute bottom-2 left-2 font-mono text-[10px] text-muted bg-obsidian/70 px-2 py-1 rounded-md pointer-events-none">
          Color preview approximated — no photo yet for this exact shade
        </div>
      )}
    </div>
  )
}
