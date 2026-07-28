import { useState } from 'react'

/* Google's `site:` search restricts results to one domain — used below for
   retailers whose own on-site search isn't a stable, documented URL (no
   public API, or a client-side search that ignores query-string params
   entirely). Confirmed by hand: RockAuto's `?query=` param lands on the
   generic catalog nav, not results; FCP Euro's search is client-rendered and
   ignores every URL param tried (`#q=`, `?q=`, `?query=`). Summit Racing and
   CARiD's own search endpoints couldn't be verified at all (bot-walled), so
   rather than ship another unverified guess, they get the same reliable
   fallback. This always lands on a real results page listing that retailer's
   actual matching pages — it just costs one extra hop through Google instead
   of going straight to the retailer.
   Amazon and eBay Motors keep their direct search params below — both are
   long-documented, stable, and confirmed correct.

   ── Affiliate tracking (Amazon + eBay only) ──
   A Google search-results page can't carry affiliate attribution for any
   network — the click has to land on the merchant's own domain. That's why
   only Amazon and eBay (which keep their direct-domain links above) get
   affiliate wrapping below; Summit/CARiD/RockAuto/FCP Euro stay on the
   Google fallback and are NOT affiliate-tracked as a structural consequence
   of that, not a missing config value. Real findings on the other four,
   for whenever their link situation changes:
     - CARiD has a real, confirmed program via the Impact network (~9%
       commission, 14-day cookie) — but requires a direct carid.com link to
       wrap, which was deliberately left on the Google fallback (see above).
     - Summit Racing is genuinely contradictory: summitracing.com/summit-
       racing-affiliate advertises 5% commission, but Summit's own FAQ states
       they have no affiliate program. Unresolved — verify directly before
       assuming either is current.
     - RockAuto shows no evidence of a joinable affiliate program on any
       major network (Awin, Pepperjam, Conversant, Rakuten) — only an
       unrelated personal referral-code system, not a trackable link format.
     - FCP Euro shows no active affiliate program either — only a B2B
       wholesale/commercial reseller application, not a content affiliate deal.
   Both new env vars below are non-secret by design (an Associate Tag/
   Campaign ID is meant to be visible in the outbound URL itself — same
   reasoning as this app's other public, client-safe VITE_ keys) and are
   both no-ops when unset, so an unconfigured deploy behaves exactly as
   before this change. */
const siteSearch = (domain, q) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`

const AMAZON_TAG    = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || ''
const EBAY_CAMPID   = import.meta.env.VITE_EBAY_CAMPAIGN_ID || ''

/* Amazon Associates: a plain `tag=` query param on any amazon.com URL —
   confirmed stable, hasn't changed in years. Get a tag at
   affiliate-program.amazon.com (real account + tax/payout info required —
   Amazon also requires 3 qualifying sales within 180 days to stay enrolled). */
function amazonUrl(q) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=automotive`
  return AMAZON_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_TAG)}` : base
}

/* eBay Partner Network: `campid` (a 10-digit Campaign ID from your EPN
   dashboard) is the required tracking parameter on any ebay.com URL;
   `toolid=10001` is EPN's documented default for a manually-built (not
   API-generated) link. `customid` is optional free-form sub-tracking —
   used here to carry which mod drove the click, real signal for which
   recommendations actually convert. Sign up at partnernetwork.ebay.com. */
function ebayUrl(q, modName) {
  const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6000`
  if (!EBAY_CAMPID) return base
  const customId = modName ? `&customid=${encodeURIComponent(modName.slice(0, 100))}` : ''
  return `${base}&campid=${encodeURIComponent(EBAY_CAMPID)}&toolid=10001${customId}`
}

/* ─── Retailers — ordered by enthusiast preference ─── */
const RETAILERS = [
  {
    id:    'amazon',
    label: 'Amazon',
    desc:  'Broadest selection, fast shipping',
    color: '#FF9900',
    url:   (q, modName) => amazonUrl(q),
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
    url:   (q) => siteSearch('summitracing.com', q),
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
    url:   (q) => siteSearch('carid.com', q),
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
    url:   (q) => siteSearch('rockauto.com', q),
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
    url:   (q, modName) => ebayUrl(q, modName),
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
    url:   (q) => siteSearch('fcpeuro.com', q),
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
          {RETAILERS.map((r) => (
            <a
              key={r.id}
              href={r.url(query, modName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200 group"
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
