// data/vehicleCatalog.js
//
// The "supported vehicles" list for the 2D photo-layer visual configurator
// (components/vehicle-visual/VehicleVisualConfigurator.jsx). Deliberately a
// curated, closed catalog — NOT "any car" — per the explicit product
// decision behind this system: real photography/renders only exist for
// vehicles listed here, and there is no 3D (or any other) fallback for
// anything else. See VehicleVisualConfigurator.jsx for what happens when
// classifyVehicle-style lookup misses.
//
// Every image path below is a PLACEHOLDER (see public/vehicles/mustang-gt-2020/
// — obviously-fake labeled SVGs, not real photos) until real assets replace
// them at the exact same paths. Swapping in real photography/renders later
// is a file-replace, not a code change, as long as filenames stay stable.
//
// `colors` and `wheels` here are a CURATED SUBSET of data/modifications.js's
// full option lists (that file stays the single source of truth for
// id/label/price — this file only adds "does a real image exist for this
// option, and where"). Ids below must match modifications.js ids exactly.

export const VEHICLE_CATALOG = [
  {
    make: 'Ford',
    model: 'Mustang GT',
    // Matches "Mustang" broadly (GT, EcoBoost, Mach 1, etc. all share the
    // same body) across recent model-year range for this generation.
    modelPattern: /mustang/i,
    yearRange: [2018, 2023],
    label: '2018–2023 Ford Mustang GT',

    // Which paint ids (from MODIFICATIONS.paint.options) have a real body
    // photo for this vehicle. Anything not listed here (any other paint id,
    // or `customColor`) uses `defaultColorId` as the photo, with a CSS tint
    // overlay approximating the actual choice — see VehicleVisualConfigurator.
    defaultColorId: 'oxfordWhite',
    colors: {
      oxfordWhite:     '/vehicles/mustang-gt-2020/body/oxfordWhite-placeholder.svg',
      glossBlack:      '/vehicles/mustang-gt-2020/body/glossBlack-placeholder.svg',
      rossaCorsa:      '/vehicles/mustang-gt-2020/body/rossaCorsa-placeholder.svg',
      performanceBlue: '/vehicles/mustang-gt-2020/body/performanceBlue-placeholder.svg',
      nardoGray:       '/vehicles/mustang-gt-2020/body/nardoGray-placeholder.svg',
      gialloOrion:     '/vehicles/mustang-gt-2020/body/gialloOrion-placeholder.svg',
    },

    // Which wheel ids (from MODIFICATIONS.wheels.options) have a real overlay
    // image. 'stock' deliberately has no entry — the base body photos above
    // already show the car on its stock wheels, so no overlay is drawn for
    // that option at all (see VehicleVisualConfigurator).
    wheelOverlays: {
      glossBlack5:    '/vehicles/mustang-gt-2020/wheels/gloss-black-5-placeholder.svg',
      gunmetal:       '/vehicles/mustang-gt-2020/wheels/gunmetal-placeholder.svg',
      polishedSilver: '/vehicles/mustang-gt-2020/wheels/polished-silver-placeholder.svg',
      goldForged:     '/vehicles/mustang-gt-2020/wheels/gold-forged-placeholder.svg',
      anthracite:     '/vehicles/mustang-gt-2020/wheels/anthracite-placeholder.svg',
      adv1:           '/vehicles/mustang-gt-2020/wheels/adv1-placeholder.svg',
      brixton:        '/vehicles/mustang-gt-2020/wheels/brixton-placeholder.svg',
      centerlock:     '/vehicles/mustang-gt-2020/wheels/centerlock-placeholder.svg',
    },

    // One glass-area cutout — tint darkness is a CSS opacity overlay on this
    // single mask (driven by MODIFICATIONS.tint.options[...].glassOpacity),
    // not a separate photo per tint level.
    glassMask: '/vehicles/mustang-gt-2020/glass-mask-placeholder.svg',
  },

  // Candidates for later (not built yet — same 10 vehicles already used in
  // evals/blind_compare.py, not a new list invented from scratch): Honda
  // Civic Si, Subaru WRX, Toyota GR86, Mazda MX-5 Miata, BMW M3, Volkswagen
  // GTI, Chevrolet Camaro SS, Nissan 370Z, Ram 1500. Each needs its own
  // 15-asset shot list (see this session's plan for the Mustang GT's) before
  // an entry can be added here.
]

/**
 * Look up a supported vehicle by make/model/year. Returns the catalog entry
 * or `null` — `null` means "no visual preview for this vehicle," never a
 * fallback to a different vehicle's assets or to 3D.
 */
export function findSupportedVehicle(make = '', model = '', year = '') {
  const yearNum = parseInt(year, 10)
  return VEHICLE_CATALOG.find(entry => {
    if (entry.make.toLowerCase() !== String(make).toLowerCase().trim()) return false
    if (!entry.modelPattern.test(model)) return false
    if (!Number.isNaN(yearNum) && entry.yearRange) {
      const [min, max] = entry.yearRange
      if (yearNum < min || yearNum > max) return false
    }
    return true
  }) || null
}
