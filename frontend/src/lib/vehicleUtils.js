// Vehicle classification — ordered by specificity, first match wins.
// Each class maps a vehicle string to a body-style bucket, used today by
// VehicleSilhouette.jsx (silhouette shape) and the Configurator's vehicle-
// class badge label. Used to also carry a 3D-model/scale/color config for
// the (now-removed) WebGL configurator — those fields are gone along with
// it; `defaultColor` stays since it's a harmless, potentially-useful neutral
// tint hint independent of any rendering approach.
const CLASSES = [
  {
    id: 'exotic',
    label: 'Exotic Hypercar',
    defaultColor: '#cc1020',
    // Hypercars and full exotics
    pattern: /ferrari|lamborghini|mclaren|pagani|bugatti|koenigsegg|rimac|senna|speedtail|huayra|chiron|jesko|regera|nevera|enzo|laferrari|sf90|296 gtb|f8 tributo|488 pista|812 superfast/i,
  },
  {
    id: 'sports-exotic',
    label: 'Sports Exotic',
    defaultColor: '#1a1a2e',
    // Premium GT / sports cars that share the exotic silhouette
    pattern: /aston martin|lotus evija|lotus emira|lotus exige|db11|db9|vantage|dbs|valkyrie|valour|vanquish|evora|esprit/i,
  },
  {
    id: 'porsche',
    label: 'Porsche / Sports GT',
    defaultColor: '#e0e0e0',
    pattern: /porsche|cayman|boxster|panamera|911/i,
  },
  {
    id: 'jdm',
    label: 'JDM Performance',
    defaultColor: '#1e3a5f',
    pattern: /supra|gt-r|gtr|nismo|r32|r33|r34|r35|rx7|rx-7|rx-8|fd3s|fc3s|evo|lancer evo|nsx|s2000|370z|350z|240sx|skyline|silvia|180sx|ae86|hachi|86|brz|gr86|gr corolla|gr supra|lfa|rcf|rc f|is 500|is500/i,
  },
  {
    id: 'hot-hatch',
    label: 'Hot Hatch',
    defaultColor: '#1a2030',
    pattern: /gti|golf.?r|type.?r|civic type|veloster|fiesta.?st|focus.?st|focus.?rs|mini.?cooper|mini.?s|mini.?jcw|jcw|polo.?gti|cupra|abarth|wrx|impreza hatch|corolla hatch|elantra.?n|ioniq.?5.?n|ioniq.?6.?n|i30.?n|i20.?n|kona.?n/i,
  },
  {
    id: 'muscle',
    label: 'American Muscle',
    defaultColor: '#1a1a1a',
    pattern: /mustang|camaro|challenger|charger|corvette|shelby|gt500|gt350|hellcat|demon|redeye|firebird|trans.?am|viper|mach.?1|dark horse|blackwing|cadillac ct/i,
  },
  {
    id: 'suv-luxury',
    label: 'Luxury SUV',
    defaultColor: '#1e2535',
    pattern: /escalade|navigator|range rover|defender|discovery|bentayga|urus|cullinan|cayenne|g.?class|g.?wagon|gls|q7|q8|x5|x6|x7|gx.?460|gx.?550|lx|qx80|qx60|dbx|gle.?63|amg.?g|gv80|sv autobiography|svr/i,
  },
  {
    id: 'suv',
    label: 'SUV / Crossover',
    defaultColor: '#1e2535',
    pattern: /rav4|cr-v|crv|explorer|tahoe|suburban|yukon|highlander|pilot|4runner|expedition|bronco|wrangler|cherokee|grand cherokee|rogue|pathfinder|equinox|traverse|blazer|edge|escape|cx-5|cx-9|cx-30|tucson|santa.?fe|sorento|telluride|palisade|sportage|kona|venza|bz4x|id\.?4|mach-e|model.?x|model.?y|ioniq|ev6|gv70|x3|x4|glb|glc|xc60|xc90|c40|ex90|grecale|levante|stelvio|alfa.?romeo.*(crossover|suv)/i,
  },
  {
    id: 'truck',
    label: 'Pickup Truck',
    defaultColor: '#1a2030',
    pattern: /f-?150|f-?250|f-?350|f-?450|silverado|sierra|ram 1500|ram 2500|ram 3500|trx|tundra|tacoma|ranger|colorado|frontier|ridgeline|maverick|cybertruck|titan|canyon|gladiator|super.?duty|raptor/i,
  },
  {
    id: 'luxury-sedan',
    label: 'Luxury Sedan',
    defaultColor: '#1a2030',
    pattern: /m3|m4|m5|m8|rs3|rs4|rs5|rs6|rs7|rs.?q8|amg.?c63|amg.?e63|amg.?a45|amg.?gt|amg.?s|c.?class|e.?class|s.?class|3.?series|5.?series|7.?series|a4|a6|a8|a7|r8|tt|stinger|genesis.?g|model.?s|model.?3|q50|q60|is.?300|is.?350|is.?500|gs.?350|gs.?f|lc.?500|giulia|ghibli|quattroporte|flying spur|ghost|phantom|wraith|dawn/i,
  },
  {
    id: 'van',
    label: 'Van / Minivan',
    defaultColor: '#1a1a1a',
    pattern: /sienna|odyssey|pacifica|grand.?caravan|transit|sprinter|promaster|minivan|metris|vito/i,
  },
  {
    id: 'sedan',
    label: 'Sedan',
    defaultColor: '#1a2030',
    pattern: /.*/,  // catch-all
  },
]

/**
 * Given vehicle make / model / year text, return the matching class config.
 * Returns id, label, and defaultColor for the matched body-style bucket.
 */
export function classifyVehicle(make = '', model = '', year = '') {
  const text = `${year} ${make} ${model}`
  for (const cls of CLASSES) {
    if (cls.pattern.test(text)) return cls
  }
  return CLASSES[CLASSES.length - 1]
}
