// Ordered by specificity — first match wins
const CLASSES = [
  {
    id: 'exotic',
    label: 'Exotic Sports Car',
    model: '/models/ferrari.glb',
    type: 'ferrari',
    scale: 1,
    yOffset: -0.02,
    defaultColor: '#cc1020',
    pattern: /ferrari|lamborghini|pagani|bugatti|koenigsegg|senna|speedtail/i,
  },
  {
    id: 'sports',
    label: 'Sports Car',
    model: '/models/ferrari.glb',
    type: 'ferrari',
    scale: 1,
    yOffset: -0.02,
    defaultColor: '#cc1020',
    pattern: /porsche|mclaren|alfa romeo|lotus|aston martin|jaguar f-type|f-type/i,
  },
  {
    id: 'jdm',
    label: 'JDM Performance',
    model: '/models/race.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1e3a5f',
    pattern: /supra|gt-r|gtr|rx7|rx-7|rx-8|evo|lancer evo|nsx|s2000|370z|350z|240sx|skyline|silvia|180sx|r32|r33|r34|r35|fd3s|ae86|hachi/i,
  },
  {
    id: 'muscle',
    label: 'American Muscle',
    model: '/models/sedan-sports.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a1a1a',
    pattern: /mustang|camaro|challenger|charger|corvette|shelby|gt500|hellcat|demon|firebird|trans.?am|viper/i,
  },
  {
    id: 'suv-luxury',
    label: 'Luxury SUV',
    model: '/models/suv-luxury.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1e2535',
    pattern: /escalade|navigator|range rover|defender|discovery|bentayga|urus|cullinan|cayenne turbo|g.?class|g.?wagon|gls|q7|q8|x5|x7|gx.?460|gx.?550|lx|qx80|qx60/i,
  },
  {
    id: 'suv',
    label: 'SUV / Crossover',
    model: '/models/suv.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1e2535',
    pattern: /rav4|cr-v|crv|explorer|tahoe|suburban|yukon|highlander|pilot|4runner|expedition|bronco|wrangler|cherokee|grand cherokee|rogue|pathfinder|equinox|traverse|blazer|edge|escape|cx-5|cx-9|cx-30|tucson|santa.?fe|sorento|telluride|palisade|sportage|kona|venza|bz4x|id\.?4|mach-e|model.?x|model.?y|ioniq|ev6|gv70|gv80|x3|x4|x6|q3|q5|glb|glc/i,
  },
  {
    id: 'truck',
    label: 'Pickup Truck',
    model: '/models/truck.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a2030',
    pattern: /f-?150|f-?250|f-?350|f-?450|silverado|sierra|ram 1500|ram 2500|tundra|tacoma|ranger|colorado|frontier|ridgeline|maverick|cybertruck|titan|canyon|gladiator|super.?duty/i,
  },
  {
    id: 'hatchback',
    label: 'Hot Hatch',
    model: '/models/hatchback-sports.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a2030',
    pattern: /gti|golf.?r|type.?r|veloster|fiesta.?st|focus.?st|focus.?rs|mini.?cooper|mini.?s|mini.?jcw|polo.?gti|cupra|abarth|wrx|impreza hatch|corolla hatch|civic.?hatch|hatchback/i,
  },
  {
    id: 'van',
    label: 'Van / Minivan',
    model: '/models/van.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a1a1a',
    pattern: /sienna|odyssey|pacifica|grand.?caravan|transit|sprinter|promaster|minivan|metris|vito/i,
  },
  {
    id: 'luxury-sedan',
    label: 'Luxury Sedan',
    model: '/models/sedan-sports.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a2030',
    pattern: /3.?series|5.?series|7.?series|m3|m4|m5|a4|a6|a8|c.?class|e.?class|s.?class|genesis.?g|cadillac|cts|ct5|ct4|model.?s|model.?3|q50|q60|is.?300|is.?350|gs.?350|ls.?500|lc.?500|stinger/i,
  },
  {
    id: 'sedan',
    label: 'Sedan',
    model: '/models/sedan.glb',
    type: 'kenney',
    scale: 1.8,
    yOffset: 0.52,
    defaultColor: '#1a2030',
    pattern: /.*/,  // catch-all
  },
]

/**
 * Given vehicle year/make/model text, return the matching class config.
 * Returns model URL, type, scale, yOffset, label, and default paint color.
 */
export function classifyVehicle(make = '', model = '', year = '') {
  const text = `${year} ${make} ${model}`
  for (const cls of CLASSES) {
    if (cls.pattern.test(text)) return cls
  }
  return CLASSES[CLASSES.length - 1] // sedan fallback
}

/** Preload URLs for all vehicle models so they're cached before the user navigates. */
export const ALL_MODEL_URLS = [
  '/models/ferrari.glb',
  '/models/sedan.glb',
  '/models/sedan-sports.glb',
  '/models/suv.glb',
  '/models/suv-luxury.glb',
  '/models/truck.glb',
  '/models/race.glb',
  '/models/hatchback-sports.glb',
  '/models/van.glb',
]
