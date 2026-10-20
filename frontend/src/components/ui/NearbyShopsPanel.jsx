import { useState } from 'react'
import { Button } from './Button'

/* US 5-digit ZIP, optionally ZIP+4 — matches this app's existing US-centric
   conventions ($ pricing, etc.). Validated entirely client-side; the value
   never leaves the browser (see module docstring below). */
const ZIP_REGEX = /^\d{5}(-\d{4})?$/

/* ─── "Find nearby shops" — a privacy-preserving MVP, deliberately minimal ───
   No geolocation permission is ever requested, no paid places/maps API is
   called, nothing is sent to our own backend, and nothing is stored
   anywhere (not localStorage, not a DB) — the ZIP code only ever exists in
   this component's own React state, used once to build a Google Maps
   search URL opened in a new tab. This is a hand-off to an external search,
   not a shop directory: no invented shop names, ratings, prices, hours, or
   claims that any specific shop can do this exact install — see the label
   below the button, which says exactly that. */
export function NearbyShopsPanel({ mod }) {
  const [open, setOpen]   = useState(false)
  const [zip, setZip]     = useState('')
  const [error, setError] = useState(null)

  const handleSearch = () => {
    const trimmed = zip.trim()
    if (!ZIP_REGEX.test(trimmed)) {
      setError('Enter a valid 5-digit ZIP code.')
      return
    }
    setError(null)
    const query = `${mod.name} installation shop near ${trimmed}`
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleZipChange = (e) => {
    setZip(e.target.value)
    if (error) setError(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="focus-ring rounded-md w-full flex items-center justify-between group"
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
        <div className="mt-3 animate-fade-in space-y-2">
          <p className="font-mono text-[10px] text-muted uppercase tracking-wider leading-relaxed">
            Opens an external Google Maps search in a new tab — not a verified shop directory.
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
            <Button type="button" variant="secondary" size="sm" onClick={handleSearch} className="focus-ring flex-shrink-0">
              Search
            </Button>
          </div>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
