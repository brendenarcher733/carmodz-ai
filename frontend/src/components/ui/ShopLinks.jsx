import { useState } from 'react'

/* ─── Retailers — ordered by enthusiast preference ─── */
const RETAILERS = [
  {
    id:    'amazon',
    label: 'Amazon',
    desc:  'Broadest selection, fast shipping',
    color: '#FF9900',
    url:   (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=automotive`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M1 9.5c1.5 2.5 4 3.5 6 3.5 1.5 0 3-.5 4-1.5" stroke="#FF9900" strokeWidth="1.25" strokeLinecap="round"/>
        <path d="M11 11l1.5-.5-.5-1.5" stroke="#FF9900" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id:    'summit',
    label: 'Summit Racing',
    desc:  'Performance parts specialists',
    color: '#E31E26',
    url:   (q) => `https://www.summitracing.com/search/keyword/${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2l5 9H2L7 2z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id:    'carid',
    label: 'CARiD',
    desc:  'OEM & aftermarket, all categories',
    color: '#0066CC',
    url:   (q) => `https://www.carid.com/search/?wd=${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:    'rockauto',
    label: 'RockAuto',
    desc:  'Lowest prices, OEM & discount',
    color: '#CC0000',
    url:   (q) => `https://www.rockauto.com/en/partsearch/?romenu=topnav&query=${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="4" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M4 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.25"/>
      </svg>
    ),
  },
  {
    id:    'ebay',
    label: 'eBay Motors',
    desc:  'New, used & rare — contact sellers directly',
    color: '#E53238',
    url:   (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6000`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 5h10M2 7h6M2 9h8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:    'fcpeuro',
    label: 'FCP Euro',
    desc:  'European performance & OEM',
    color: '#003DA5',
    url:   (q) => `https://www.fcpeuro.com/search#q=${encodeURIComponent(q)}`,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
  },
]

/* ─── Component ─── */
export function ShopLinks({ modName, vehicle }) {
  const [open, setOpen] = useState(false)

  /* Build the search query from vehicle + mod name */
  const vehicleStr = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ` : ''
  const query      = `${vehicleStr}${modName}`

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-accent">
            <path d="M6.5 1.5v2M6.5 9.5v2M1.5 6.5h2M9.5 6.5h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
            <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
          </svg>
          <span className="font-mono text-xs uppercase tracking-wider text-muted group-hover:text-body transition-colors">
            Where to Buy
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-1.5 animate-fade-in">
          {RETAILERS.map((r) => (
            <a
              key={r.id}
              href={r.url(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-150 group"
            >
              {/* Color dot */}
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />

              {/* Label + desc */}
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-white text-sm group-hover:text-accent transition-colors">
                  {r.label}
                </div>
                <div className="font-mono text-xs text-muted truncate">{r.desc}</div>
              </div>

              {/* External link arrow */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                <path d="M2 10L10 2M5 2h5v5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}

          <p className="font-mono text-xs text-muted px-1 mt-1">
            Links auto-search for your {vehicle?.make} {vehicle?.model}. Results may vary.
          </p>
        </div>
      )}
    </div>
  )
}
