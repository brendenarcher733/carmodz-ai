/* ─── Directions links — Google Maps / Apple Maps ───
   Pure URL templating from a shop's own address/coordinates, same "trusted
   application code builds the URL" pattern as lib/retailers.js. Lives here,
   not in ShopLinks.jsx or retailers.js — those are online-retailer links,
   this is the nearby-shops (location search) feature's own concern. Prefers
   lat/lng when the provider supplied it (more precise), falls back to the
   address string otherwise. */

export function googleMapsDirectionsUrl({ address, latitude, longitude }) {
  const destination = (typeof latitude === 'number' && typeof longitude === 'number')
    ? `${latitude},${longitude}`
    : address
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

export function appleMapsDirectionsUrl({ address, latitude, longitude }) {
  const destination = (typeof latitude === 'number' && typeof longitude === 'number')
    ? `${latitude},${longitude}`
    : address
  return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`
}
