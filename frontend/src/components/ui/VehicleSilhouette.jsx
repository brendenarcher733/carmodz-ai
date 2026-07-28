import { classifyVehicle } from '../../lib/vehicleUtils'

/* Side-profile vehicle silhouettes, one per body-style shape. Reuses the same
   `classifyVehicle()` classifier already driving the Configurator's 3D model
   picker (lib/vehicleUtils.js) so a build's silhouette here and its 3D model
   elsewhere always agree — several of classifyVehicle's 12 buckets already
   intentionally share a GLB model (e.g. exotic/sports-exotic/porsche all use
   ferrari.glb), so they share a silhouette shape here too.
   Single continuous body path + two wheel circles per shape, drawn on a
   shared 240x100 baseline — proportions (ride height, hood/greenhouse
   length, roofline) carry the body-style read, not literal per-model detail.
   This is a deliberately schematic/blueprint style, not a photo — it's meant
   to sit on top of the "dyno sheet" texture treatment, not compete with it. */

const SHAPES = {
  'sports-coupe': {
    body: 'M8 74 C8 68 18 62 34 58 C46 40 64 26 84 22 C102 18 128 17 152 20 C172 22 192 30 208 44 C220 52 230 60 232 68 L232 74 Z',
    wheels: [[54, 76, 15], [188, 76, 15]],
  },
  'jdm-compact': {
    body: 'M10 74 C10 66 20 58 36 54 C46 38 60 26 78 22 C96 18 128 18 150 24 C168 28 182 38 194 50 C208 56 220 62 226 70 L226 74 Z',
    wheels: [[52, 76, 14], [180, 76, 14]],
  },
  hatchback: {
    body: 'M12 72 C12 64 22 56 38 52 C48 36 60 24 76 20 C92 16 112 16 126 22 C138 27 144 36 146 46 L200 46 C210 46 216 54 218 64 L218 72 Z',
    wheels: [[50, 74, 13], [178, 74, 13]],
  },
  muscle: {
    body: 'M6 74 L6 68 C6 62 14 58 26 57 L96 50 C110 32 128 22 148 20 C166 18 182 22 194 32 C206 38 216 48 222 60 C228 64 232 68 232 74 Z',
    wheels: [[58, 76, 14.5], [198, 76, 14.5]],
  },
  suv: {
    body: 'M10 70 L10 46 C10 38 16 32 24 30 L56 26 C64 20 74 16 86 16 L184 16 C196 16 206 22 212 32 L224 36 C230 38 232 42 232 48 L232 70 Z',
    wheels: [[52, 74, 16], [190, 74, 16]],
  },
  truck: {
    body: 'M8 70 L8 46 C8 38 14 32 22 30 L62 26 C70 18 82 14 94 14 L128 14 C136 14 142 20 142 28 L142 40 L206 40 C214 40 220 46 220 54 L220 70 Z',
    wheels: [[46, 74, 16], [188, 74, 16]],
  },
  sedan: {
    body: 'M10 70 C10 64 18 58 32 56 C42 40 58 26 78 20 C94 16 118 16 134 20 C150 24 158 34 160 46 C182 48 202 52 216 58 C224 62 230 66 230 70 Z',
    wheels: [[54, 74, 14.5], [188, 74, 14.5]],
  },
  van: {
    body: 'M10 70 L10 34 C10 24 18 16 28 16 L200 16 C212 16 222 26 224 40 L224 70 Z',
    wheels: [[48, 74, 15], [190, 74, 15]],
  },
}

/* classifyVehicle() bucket id -> silhouette shape key */
const CLASS_TO_SHAPE = {
  exotic: 'sports-coupe',
  'sports-exotic': 'sports-coupe',
  porsche: 'sports-coupe',
  jdm: 'jdm-compact',
  'hot-hatch': 'hatchback',
  muscle: 'muscle',
  'suv-luxury': 'suv',
  suv: 'suv',
  truck: 'truck',
  'luxury-sedan': 'sedan',
  van: 'van',
  sedan: 'sedan',
}

/**
 * A body-style-matched vehicle silhouette for a given make/model/year.
 * `tone`:
 *   'watermark' — large, low-opacity, sits behind other content (garage cards)
 *   'feature'   — brighter, accent-tinted linework for a hero/spotlight slot
 * `animated` — feature-mode only: the outline draws itself in once on mount
 *   (same stroke-dashoffset technique as the navbar Logo mark, via the
 *   `.vs-draw` keyframes in globals.css). Off by default — the garage-card
 *   and build-detail placements are meant to sit quietly, not animate every
 *   time they scroll into view.
 */
export function VehicleSilhouette({ make, model, year, tone = 'watermark', color, className, animated = false }) {
  const cls = classifyVehicle(make, model, year)
  const shape = SHAPES[CLASS_TO_SHAPE[cls.id]] || SHAPES.sedan
  const stroke = color || 'currentColor'

  const isFeature = tone === 'feature'
  const draw = isFeature && animated

  return (
    <svg viewBox="0 0 240 100" className={className} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {isFeature ? (
        <path
          d={shape.body} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
          {...(draw ? { pathLength: '1', className: 'vs-draw' } : {})}
        />
      ) : (
        <path d={shape.body} fill={stroke} />
      )}
      {shape.wheels.map(([cx, cy, r], i) =>
        isFeature ? (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth="1.6"
            {...(draw ? { pathLength: '1', className: 'vs-draw', style: { animationDelay: `${0.7 + i * 0.15}s` } } : {})}
          />
        ) : (
          <circle key={i} cx={cx} cy={cy} r={r} fill={stroke} />
        )
      )}
    </svg>
  )
}
