import { useState } from 'react'
import { retailersForCategory, splitPrimaryAndMore, retailerLabel, buildQuery, isSafeUrl } from '../../lib/retailers'

/* Presentational only (one-line description per retailer) — deliberately
   kept out of lib/retailers.js's data registry, which only carries the
   fields the audit's registry spec calls for (key/label/categories/
   buildUrl/linkType/enabled). Same copy as the pre-refactor version, keyed
   by retailer key so this component is the only place that needs it. */
const RETAILER_DESC = {
  amazon:   'Broadest selection, fast shipping',
  summit:   'Performance parts specialists',
  carid:    'OEM & aftermarket, all categories',
  rockauto: 'Lowest prices, OEM & discount',
  ebay:     'New, used & rare — contact sellers directly',
  fcpeuro:  'European performance & OEM',
}

/* ─── Component ───
   Retailer definitions, category prioritization, query selection, and URL
   safety all live in lib/retailers.js — this component is just the list +
   the existing collapse/expand UI around it. Frontend-only: no backend
   call, no new network request, nothing here ever renders a URL that wasn't
   built by our own buildUrl() functions from trusted inputs. */
export function ShopLinks({ modName, category, exactProduct, vehicle }) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const query = buildQuery({ exactProduct, vehicle, modName })
  const isPrecise = Boolean(exactProduct && exactProduct.trim())

  const retailers = retailersForCategory(category)
  const { primary, more } = splitPrimaryAndMore(retailers)
  const visible = showMore ? retailers : primary

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
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
          {visible.map((r) => {
            const href = r.buildUrl(query, modName)
            if (!isSafeUrl(href)) return null   // defense-in-depth — every current buildUrl() is https:-only already
            return (
              <a
                key={r.key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200 group"
              >
                {/* Color dot */}
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-white text-sm group-hover:text-accent transition-colors">
                    {retailerLabel(r)}
                  </div>
                  <div className="font-mono text-xs text-muted truncate">{RETAILER_DESC[r.key]}</div>
                </div>

                {/* External link arrow */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted group-hover:text-accent transition-colors flex-shrink-0">
                  <path d="M2 10L10 2M5 2h5v5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )
          })}

          {!showMore && more.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="text-left font-mono text-xs text-muted hover:text-body transition-colors px-1 py-1"
            >
              More retailers ({more.length})
            </button>
          )}

          <p className="font-mono text-xs text-muted px-1 mt-1">
            {isPrecise
              ? `Searching for "${exactProduct}" — confirm fitment before buying.`
              : `General search for your ${vehicle?.make || ''} ${vehicle?.model || ''}. Results may vary.`}
          </p>
        </div>
      )}
    </div>
  )
}
