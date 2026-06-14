export const MODIFICATIONS = {
  paint: {
    label: 'Paint & Wraps',
    single: true,
    options: [
      { id: 'oxfordWhite',     label: 'Oxford White',        color: '#f4f0eb', metalness: 0.40, roughness: 0.30, price: 0 },
      { id: 'glossBlack',      label: 'Gloss Black',         color: '#0a0a0a', metalness: 0.85, roughness: 0.12, price: 1800 },
      { id: 'matteBlack',      label: 'Matte Black',         color: '#181818', metalness: 0.05, roughness: 0.95, price: 2400 },
      { id: 'satinBlack',      label: 'Satin Black',         color: '#141414', metalness: 0.25, roughness: 0.55, price: 2100 },
      { id: 'performanceBlue', label: 'Performance Blue',    color: '#0c2d7c', metalness: 0.75, roughness: 0.22, price: 1600 },
      { id: 'rapidRed',        label: 'Rapid Red',           color: '#8b1a1a', metalness: 0.65, roughness: 0.22, price: 1600 },
      { id: 'magneticGray',    label: 'Magnetic Gray',       color: '#3a3a42', metalness: 0.70, roughness: 0.25, price: 1600 },
      { id: 'grabberYellow',   label: 'Grabber Yellow',      color: '#c8a800', metalness: 0.55, roughness: 0.28, price: 1600 },
      { id: 'deepViolet',      label: 'Kona Blue Metallic',  color: '#0e1f52', metalness: 0.78, roughness: 0.20, price: 1750 },
      { id: 'carbonWrap',      label: 'Carbon Fiber Wrap',   color: '#111111', metalness: 0.08, roughness: 0.62, price: 4500 },
      { id: 'customColor',     label: 'Custom Color',        custom: true,                                       price: 2500 },
    ],
  },

  tint: {
    label: 'Window Tint',
    single: true,
    options: [
      { id: 'none',   label: 'No Tint (factory)', glassOpacity: 0.22, glassColor: '#8fb8d4', price: 0 },
      { id: 'light',  label: 'Light — 35%',       glassOpacity: 0.42, glassColor: '#334455', price: 250 },
      { id: 'medium', label: 'Medium — 20%',      glassOpacity: 0.62, glassColor: '#1a2833', price: 320 },
      { id: 'dark',   label: 'Dark — 5%',         glassOpacity: 0.80, glassColor: '#0d1520', price: 400 },
      { id: 'limo',   label: 'Limo — 1%',         glassOpacity: 0.94, glassColor: '#050a0f', price: 480 },
    ],
  },

  wheels: {
    label: 'Wheels',
    single: true,
    options: [
      { id: 'stock',         label: 'GT500 Carbon Stack (Stock)',    rimColor: '#999999', metalness: 0.95, roughness: 0.08, price: 0 },
      { id: 'glossBlack5',   label: 'Niche Gamma Gloss Black',       rimColor: '#111111', metalness: 0.88, roughness: 0.12, price: 2400 },
      { id: 'gunmetal',      label: 'Forgeline GA1R Gunmetal',       rimColor: '#3c3c40', metalness: 0.80, roughness: 0.20, price: 4200 },
      { id: 'polishedSilver',label: 'HRE FlowForm Polished',         rimColor: '#d8d8d8', metalness: 0.97, roughness: 0.04, price: 3800 },
      { id: 'goldForged',    label: 'Vossen VF-5 Satin Gold',        rimColor: '#8b7000', metalness: 0.90, roughness: 0.15, price: 5200 },
      { id: 'anthracite',    label: 'Vorsteiner VFFS Anthracite',    rimColor: '#2a2a2c', metalness: 0.50, roughness: 0.60, price: 4800 },
    ],
  },

  performance: {
    label: 'Performance',
    multi: true,
    options: [
      { id: 'catback',      label: 'Borla S-Type Cat-Back Exhaust',      price: 1849 },
      { id: 'axleback',     label: 'Flowmaster Outlaw Axle-Back',        price: 799 },
      { id: 'headers',      label: 'Kooks 1-7/8" Long-Tube Headers',     price: 2395 },
      { id: 'intake',       label: 'Roush Cold Air Intake',              price: 489 },
      { id: 'supercharger', label: 'Whipple 3.0L TVS Supercharger',      price: 9195 },
      { id: 'turbo',        label: 'Hellion Eliminator Twin Turbo Kit',  price: 12995 },
      { id: 'tune',         label: 'Lund Racing Custom E85 Tune',        price: 650 },
    ],
  },

  exterior: {
    label: 'Exterior Mods',
    multi: true,
    options: [
      { id: 'spoiler',      label: 'Shelby GT500 Trunk Spoiler',        price: 1149, showSpoiler: true },
      { id: 'frontsplitter',label: 'APR Carbon Fiber Front Splitter',   price: 895,  showSplitter: true },
      { id: 'diffuser',     label: 'Carbon Fiber Rear Diffuser',        price: 945,  showDiffuser: true },
      { id: 'sideskirts',   label: 'Roush Side Skirt Extensions',       price: 695,  showSkirts: true },
      { id: 'hood',         label: 'Anderson Composites Carbon Hood',   price: 1895 },
      { id: 'widebody',     label: 'Clinched Widebody Flare Kit',       price: 6800 },
    ],
  },
}
