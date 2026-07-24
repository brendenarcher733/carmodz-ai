// services/analytics.js — Pluggable product analytics (PostHog). Mirrors the
// no-op-until-configured pattern already used for AI_PROVIDER/EMAIL_PROVIDER
// on the backend: VITE_POSTHOG_KEY unset means every call below is a no-op
// and the app behaves identically to before this existed.
import posthog from 'posthog-js'

const KEY  = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function init() {
  if (initialized) return
  if (!KEY) {
    if (import.meta.env.DEV) {
      console.error('VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured')
    }
    return
  }
  posthog.init(KEY, {
    api_host: HOST,
    // Route changes are captured explicitly (see RouteTracker in main.jsx) —
    // this SPA never does a full page load between routes, so PostHog's own
    // autocapture pageview (which fires once, on script load) would miss
    // every navigation after the first.
    capture_pageview: false,
    // Session replay is opt-in per authenticated session (started/stopped
    // around login/logout in AuthContext), not left running on the public
    // marketing pages — see contexts/AuthContext.jsx.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
    },
  })
  initialized = true
}

export function capture(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function identify(user) {
  if (!initialized || !user) return
  posthog.identify(String(user.id), { email: user.email, name: user.name })
}

export function reset() {
  if (!initialized) return
  posthog.stopSessionRecording()
  posthog.reset()
}

export function startSessionRecording() {
  if (!initialized) return
  posthog.startSessionRecording()
}

export function captureException(error, properties = {}) {
  if (!initialized) return
  posthog.captureException(error, { ...properties })
}
