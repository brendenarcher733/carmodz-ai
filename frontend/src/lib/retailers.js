/* ─── Retailer registry — frontend-only, no backend involvement ───
   Centralizes what used to be ShopLinks.jsx's inline RETAILERS array. Every
   URL here is built by our own code from trusted inputs (recommendation
   name, suggested_search_terms, vehicle) — never from raw AI-provided URL
   text, which this app never generates or accepts in the first place. */

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
   of that, not a missing config value. Both env vars below are non-secret by
   design (an Associate Tag/Campaign ID is meant to be visible in the
   outbound URL itself) and are both no-ops when unset, so an unconfigured
   deploy behaves exactly as before this change. */
const siteSearch = (domain, q) => `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`

const AMAZON_TAG  = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG || ''
const EBAY_CAMPID = import.meta.env.VITE_EBAY_CAMPAIGN_ID || ''

/* Amazon Associates: a plain `tag=` query param on any amazon.com URL —
   confirmed stable, hasn't changed in years. */
function amazonUrl(q) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=automotive`
  return AMAZON_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_TAG)}` : base
}

/* eBay Partner Network: `campid` (a 10-digit Campaign ID from your EPN
   dashboard) is the required tracking parameter on any ebay.com URL;
   `toolid=10001` is EPN's documented default for a manually-built (not
   API-generated) link. `customid` is optional free-form sub-tracking —
   used here to carry which mod drove the click. */
function ebayUrl(q, modName) {
  const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6000`
  if (!EBAY_CAMPID) return base
  const customId = modName ? `&customid=${encodeURIComponent(modName.slice(0, 100))}` : ''
  return `${base}&campid=${encodeURIComponent(EBAY_CAMPID)}&toolid=10001${customId}`
}

/* ─── Category relevance ───
   Reliable at the level this app can actually claim: ModRecommendation's
   category enum (performance/handling/sound/cosmetic/reliability/interior)
   says what KIND of part this is, which maps sensibly to which retailer
   tends to carry it. It says nothing about vehicle brand/origin, so FCP
   Euro (brand-specific, not category-specific) never gets promoted to
   "primary" for any category — promoting it based on category alone would
   be an unreliable claim this data can't actually support. Every retailer
   still appears for every category (never an empty section) — this only
   controls display order. */
const CATEGORY_PRIORITY = {
  performance:  ['summit', 'amazon', 'ebay', 'carid', 'rockauto', 'fcpeuro'],
  handling:     ['summit', 'amazon', 'carid', 'rockauto', 'ebay', 'fcpeuro'],
  sound:        ['amazon', 'summit', 'ebay', 'carid', 'rockauto', 'fcpeuro'],
  cosmetic:     ['amazon', 'carid', 'ebay', 'summit', 'rockauto', 'fcpeuro'],
  reliability:  ['rockauto', 'amazon', 'carid', 'summit', 'ebay', 'fcpeuro'],
  interior:     ['amazon', 'carid', 'ebay', 'summit', 'rockauto', 'fcpeuro'],
}
const DEFAULT_PRIORITY = ['amazon', 'summit', 'carid', 'ebay', 'rockauto', 'fcpeuro']

/* How many of the top-priority retailers show before the "More retailers"
   divider — same count on every category, so the fold position never jumps
   around depending on what's being shopped for. */
const PRIMARY_COUNT = 3

/* ─── Registry ───
   key              — stable identifier, used for ordering/lookup, never shown
   label            — the retailer's display name
   categories       — 'all', or the subset of ModRecommendation.category this
                       retailer meaningfully serves (every current entry is
                       'all' — all six are general automotive retailers; kept
                       as a field, not hardcoded 'all' inline, so a future
                       category-specific retailer has somewhere to say so)
   linkType         — 'search' (lands on a results page) or 'product' (a
                       verified exact product URL) — only ever 'search' today;
                       no retailer here has a verified exact-product URL path
   enabled          — lets a retailer be turned off without deleting its entry
   buildUrl(q, modName) — returns an https:// URL built from trusted inputs only
*/
export const RETAILERS = [
  {
    key: 'amazon', label: 'Amazon', categories: 'all', linkType: 'search', enabled: true,
    color: '#FF9900',
    buildUrl: (q) => amazonUrl(q),
  },
  {
    key: 'summit', label: 'Summit Racing', categories: 'all', linkType: 'search', enabled: true,
    color: '#E31E26',
    buildUrl: (q) => siteSearch('summitracing.com', q),
  },
  {
    key: 'carid', label: 'CARiD', categories: 'all', linkType: 'search', enabled: true,
    color: '#0066CC',
    buildUrl: (q) => siteSearch('carid.com', q),
  },
  {
    key: 'rockauto', label: 'RockAuto', categories: 'all', linkType: 'search', enabled: true,
    color: '#CC0000',
    buildUrl: (q) => siteSearch('rockauto.com', q),
  },
  {
    key: 'ebay', label: 'eBay Motors', categories: 'all', linkType: 'search', enabled: true,
    color: '#E53238',
    buildUrl: (q, modName) => ebayUrl(q, modName),
  },
  {
    key: 'fcpeuro', label: 'FCP Euro', categories: 'all', linkType: 'search', enabled: true,
    color: '#003DA5',
    buildUrl: (q) => siteSearch('fcpeuro.com', q),
  },
]

const BY_KEY = Object.fromEntries(RETAILERS.map(r => [r.key, r]))

/* retailer-appropriate label — never claims checkout/purchase, since every
   link here is a search or category-results page, not a cart/payment flow. */
export function retailerLabel(retailer) {
  if (retailer.linkType === 'product') return 'View product'
  if (retailer.key === 'amazon') return 'Search Amazon'
  if (retailer.key === 'ebay') return 'Search eBay Motors'
  return `Find at ${retailer.label}`
}

/* Ordered, enabled retailers for a given recommendation category — primary
   (category-relevant) first, then everything else. Category falling outside
   the known map (or missing) just uses the default order; every enabled
   retailer is always included, so this never produces an empty list. */
export function retailersForCategory(category) {
  const order = CATEGORY_PRIORITY[category] || DEFAULT_PRIORITY
  const ordered = order.map(key => BY_KEY[key]).filter(Boolean)
  // Any enabled retailer not covered by the priority list (e.g. a future
  // addition not yet slotted into CATEGORY_PRIORITY) still appears, appended
  // at the end rather than silently dropped.
  const covered = new Set(order)
  const rest = RETAILERS.filter(r => !covered.has(r.key))
  return [...ordered, ...rest].filter(r => r.enabled)
}

export function splitPrimaryAndMore(retailers) {
  return { primary: retailers.slice(0, PRIMARY_COUNT), more: retailers.slice(PRIMARY_COUNT) }
}

/* ─── URL safety ───
   Every URL in this module is built by buildUrl() above from trusted inputs
   — never from raw AI output. This check is defense-in-depth against a
   future regression (e.g. someone wiring an AI-provided string directly
   into a URL), not a response to any URL this app currently constructs. */
export function isSafeUrl(url) {
  return typeof url === 'string' && url.startsWith('https://')
}

/* ─── Query selection ───
   a. The first suggested_search_terms entry, if one exists (ModCard.jsx
      passes it as `exactProduct` — already the single most targeted signal
      available, a real brand + product-type phrase; the backend's own
      sanitizer, services/ai_service.py::_sanitize_recommendation_dict, is
      what guarantees suggested_search_terms never contains an empty/
      whitespace-only string, so an index-0 read is already "first non-empty
      entry" by construction — no extra filtering needed here).
   b. Vehicle year/make/model + recommendation name, when no search term
      exists at all.
   c. Recommendation name alone, if vehicle data is also unavailable.
   Deliberately only ever uses ONE search term, never concatenates multiple
   — a single precise phrase searches better than a run-on string of three. */
export function buildQuery({ exactProduct, vehicle, modName }) {
  if (typeof exactProduct === 'string' && exactProduct.trim()) return exactProduct.trim()

  const vehicleStr = vehicle?.year || vehicle?.make || vehicle?.model
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.replace(/\s+/g, ' ').trim()
    : ''
  if (vehicleStr) return `${vehicleStr} ${modName}`.trim()

  return modName
}
