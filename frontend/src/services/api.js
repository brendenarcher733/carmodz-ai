// services/api.js — All API calls centralized here
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  // Required for the refresh_token cookie (routers/auth.py) to actually be
  // sent/received cross-origin — without this, every request silently drops
  // the cookie regardless of what the backend sets.
  withCredentials: true,
})

// Attach the access token to every request if present.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/* FastAPI's validation errors (422) come back as `detail: [{msg, loc, ...}]`,
   not a plain string like every other error here — rendering that shape
   directly produces "[object Object]"-style garbage in the UI. Flatten it
   into one readable sentence instead. */
function extractErrorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msg = detail
      .map(d => (d.msg || '').replace(/^Value error,\s*/, ''))
      .filter(Boolean)
      .join(' ')
    return msg || 'Please check your input and try again.'
  }
  if (err.response) return 'Something went wrong. Please try again.'
  return "Can't reach the server right now — check your connection and try again."
}

// Concurrent 401s (e.g. several requests fired around the same time as the
// access token expires) should trigger exactly one /refresh call, not one
// per request — every caller awaits the same in-flight promise.
let refreshPromise = null

// Exported so AuthContext can reuse the exact same read/write logic for
// explicit login/signup instead of a second, driftable copy of it.
export function persistSession(data) {
  localStorage.setItem('cm_token', data.access_token)
  localStorage.setItem('cm_csrf',  data.csrf_token)
  localStorage.setItem('cm_user',  JSON.stringify(data.user))
}

export function clearSession() {
  localStorage.removeItem('cm_token')
  localStorage.removeItem('cm_csrf')
  localStorage.removeItem('cm_user')
}

api.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config
    const isAuthEndpoint = /\/api\/auth\/(login|signup|refresh)$/.test(original?.url || '')

    // Silent refresh-and-retry, once, for anything that isn't itself part
    // of the login/refresh flow (retrying a failed /refresh with another
    // /refresh would just recurse into the same failure).
    if (err.response?.status === 401 && !original._retried && !isAuthEndpoint && localStorage.getItem('cm_token')) {
      original._retried = true
      try {
        if (!refreshPromise) {
          refreshPromise = authApi.refresh().finally(() => { refreshPromise = null })
        }
        const data = await refreshPromise
        persistSession(data)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        clearSession()
        if (!location.pathname.startsWith('/login')) location.assign('/login')
        return Promise.reject(new Error('Your session expired — please sign in again.'))
      }
    }

    // A 401 that reaches here is either the refresh call itself failing, or
    // a second failure right after an already-attempted retry — either way
    // the session is genuinely gone.
    if (err.response?.status === 401 && localStorage.getItem('cm_token')) {
      clearSession()
      if (!location.pathname.startsWith('/login')) location.assign('/login')
    }

    return Promise.reject(new Error(extractErrorMessage(err)))
  }
)

export const buildsApi = {
  // create now returns near-instantly (status='pending') — recommendation
  // generation happens async on a worker. No more 90s timeout override;
  // the old one existed specifically to survive the blocking Claude call
  // this endpoint used to make inline.
  create:          (data) => api.post('/api/builds/', data),
  list:            ()     => api.get('/api/builds/'),
  get:             (id)   => api.get(`/api/builds/${id}`),
  getStatus:       (id)   => api.get(`/api/builds/${id}/status`),
  getPlan:         (id)   => api.get(`/api/builds/${id}/plan`),
  retry:           (id)   => api.post(`/api/builds/${id}/retry`),
  delete:          (id)   => api.delete(`/api/builds/${id}`),
  toggleFavourite: (id)   => api.patch(`/api/builds/${id}/favourite`),
  stats:           ()     => api.get('/api/builds/stats'),
}

export const advisorApi = {
  chat: (message, sessionId, vehicle = null, buildId = null) =>
    api.post('/api/mod-advisor/chat', {
      message,
      session_id: sessionId,
      vehicle,
      build_id: buildId,
    }),
  quickRecs: (payload) => api.post('/api/mod-advisor/quick-recs', payload),

  // Streaming variant of chat — uses raw fetch + ReadableStream rather than
  // axios (which buffers the whole response body) or EventSource (which
  // can't send a POST body or an Authorization header, both required here).
  // Calls onToken per text chunk as it arrives, onDone once with the final
  // suggestion chips, onError if the request itself fails.
  streamChat: async (message, sessionId, vehicle, buildId, { onToken, onDone, onError }) => {
    const token = localStorage.getItem('cm_token')
    const baseURL = import.meta.env.VITE_API_URL || ''
    try {
      const res = await fetch(`${baseURL}/api/mod-advisor/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, session_id: sessionId, vehicle, build_id: buildId }),
      })
      if (!res.ok || !res.body) throw new Error(`Request failed with status ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 2)
          if (!frame.startsWith('data:')) continue
          const payload = JSON.parse(frame.slice(5).trim())
          if (payload.type === 'token') onToken(payload.text)
          else if (payload.type === 'done') onDone(payload.suggestions)
        }
      }
    } catch (err) {
      onError(err)
    }
  },
}

export const authApi = {
  signup: (name, email, password) =>
    api.post('/api/auth/signup', { name, email, password }),
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),

  // refresh_token itself travels as an httpOnly cookie the browser attaches
  // automatically (hence withCredentials above) — these two calls just need
  // to prove they're legitimate via the CSRF token issued alongside it.
  refresh: () =>
    api.post('/api/auth/refresh', {}, {
      headers: { 'X-CSRF-Token': localStorage.getItem('cm_csrf') || '' },
    }),
  logout: () =>
    api.post('/api/auth/logout', {}, {
      headers: { 'X-CSRF-Token': localStorage.getItem('cm_csrf') || '' },
    }),

  forgotPassword:     (email)              => api.post('/api/auth/forgot-password', { email }),
  resetPassword:      (token, newPassword) => api.post('/api/auth/reset-password', { token, new_password: newPassword }),
  verifyEmail:        (token)              => api.post('/api/auth/verify-email', { token }),
  resendVerification: ()                   => api.post('/api/auth/resend-verification'),
}

export const healthApi = {
  check: () => api.get('/health'),
}
