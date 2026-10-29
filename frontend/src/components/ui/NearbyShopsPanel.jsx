import { useState } from 'react'
import { Button } from './Button'
import { Spinner } from './Spinner'
import { Alert } from './Alert'
import { shopsApi } from '../../services/api'
import { googleMapsDirectionsUrl, appleMapsDirectionsUrl } from '../../lib/directions'

/* US 5-digit ZIP, optionally ZIP+4 — matches this app's existing US-centric
   conventions ($ pricing, etc.). Validated client-side first; the backend
   (models/shop.py::NearbyShopsRequest) validates it again as the real trust
   boundary. */
const ZIP_REGEX = /^\d{5}(-\d{4})?$/

/* ─── "Find nearby shops" — a location-search feature, deliberately
   separate from ShopLinks' online-retailer links (see lib/retailers.js;
   that component has no geolocation/search logic and never will).
   The ZIP is sent once, to our own backend, to find real nearby shops —
   never to a third party directly, never stored (not in a DB, not in
   localStorage), and only ever used for this one search. If no location
   provider is configured for this deployment, the backend says so
   explicitly (status="not_configured") rather than returning fake shops or
   failing silently — see services/places_provider.py. */
export function NearbyShopsPanel({ mod }) {
  const [open, setOpen]     = useState(false)
  const [zip, setZip]       = useState('')
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)   // last NearbyShopsResponse, or null before a first search

  const runSearch = async () => {
    const trimmed = zip.trim()
    if (!ZIP_REGEX.test(trimmed)) {
      setError('Enter a valid 5-digit ZIP code.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data = await shopsApi.nearby(trimmed, mod.category)
      setResult(data)
    } catch {
      setResult({ status: 'error', shops: [], message: "Couldn't reach shop search right now — try again in a moment." })
    } finally {
      setLoading(false)
    }
  }

  const handleZipChange = (e) => {
    setZip(e.target.value)
    if (error) setError(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runSearch()
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="focus-ring rounded-md tap-target md:min-h-0 w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-accent">
            <path d="M6.5 11.5s4-3.5 4-6.75A4 4 0 002.5 4.75C2.5 8 6.5 11.5 6.5 11.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
            <circle cx="6.5" cy="4.75" r="1.25" stroke="currentColor" strokeWidth="1.1"/>
          </svg>
          <span className="font-mono text-xs uppercase tracking-wider text-muted group-hover:text-body transition-colors">
            Find Nearby Shops
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
        <div className="mt-3 animate-fade-in space-y-3">
          <p className="font-mono text-[10px] text-muted uppercase tracking-wider leading-relaxed">
            Your ZIP is sent once to search for nearby shops — never stored, never shared.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              aria-label="ZIP code"
              placeholder="ZIP code"
              value={zip}
              onChange={handleZipChange}
              onKeyDown={handleKeyDown}
              maxLength={10}
              aria-invalid={Boolean(error)}
              className="field-input flex-1 !py-2.5 !px-3.5 text-sm"
            />
            <Button type="button" variant="secondary" size="sm" onClick={runSearch} loading={loading} className="focus-ring flex-shrink-0">
              Search
            </Button>
          </div>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          {loading && (
            <div className="flex items-center gap-2.5 text-muted text-xs py-2">
              <Spinner size="sm" />
              Searching nearby shops…
            </div>
          )}

          {!loading && result && <ShopSearchResult result={result} onRetry={runSearch} />}
        </div>
      )}
    </div>
  )
}

function ShopSearchResult({ result, onRetry }) {
  if (result.status === 'not_configured') {
    return (
      <p className="font-mono text-xs text-muted leading-relaxed">
        {result.message || 'Location search isn’t configured for this deployment.'}
      </p>
    )
  }

  if (result.status === 'error') {
    return (
      <div className="space-y-2">
        <Alert variant="error">
          <span className="text-xs">{result.message || "Couldn't load nearby shops right now."}</span>
        </Alert>
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (result.status === 'no_results' || result.shops.length === 0) {
    return (
      <p className="font-mono text-xs text-muted leading-relaxed">
        No shops found near that ZIP. Try a different one.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {result.shops.map((shop, i) => <ShopCard key={`${shop.name}-${i}`} shop={shop} />)}
    </div>
  )
}

function ShopCard({ shop }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display font-semibold text-white text-sm truncate">{shop.name}</div>
          <div className="font-mono text-xs text-muted">{shop.category}</div>
        </div>
        {shop.distance_miles != null && (
          <div className="font-mono text-xs text-accent whitespace-nowrap flex-shrink-0">{shop.distance_miles} mi</div>
        )}
      </div>

      <p className="text-xs text-body mt-1.5">{shop.address}</p>

      {/* Rating/hours only ever render when the provider actually supplied
          them — never computed or guessed by this component. */}
      {(shop.rating != null || shop.hours_today) && (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {shop.rating != null && (
            <span className="font-mono text-xs text-muted">
              ★ {shop.rating}{shop.rating_count != null ? ` (${shop.rating_count})` : ''}
            </span>
          )}
          {shop.hours_today && <span className="font-mono text-xs text-muted">{shop.hours_today}</span>}
        </div>
      )}

      {shop.phone && (
        <a href={`tel:${shop.phone}`} className="font-mono text-xs text-accent hover:underline underline-offset-2 mt-1 inline-block">
          {shop.phone}
        </a>
      )}

      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.05]">
        <a
          href={googleMapsDirectionsUrl(shop)} target="_blank" rel="noopener noreferrer"
          className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
        >
          Directions (Google)
        </a>
        <a
          href={appleMapsDirectionsUrl(shop)} target="_blank" rel="noopener noreferrer"
          className="focus-ring rounded-md font-mono text-xs text-accent hover:underline underline-offset-2"
        >
          Directions (Apple)
        </a>
      </div>
    </div>
  )
}
