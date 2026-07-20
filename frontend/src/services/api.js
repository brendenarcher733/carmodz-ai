// services/api.js — All API calls centralized here
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if present
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor for unified error handling
api.interceptors.response.use(
  res => res.data,
  err => {
    // Expired/invalid token — clear local session so the UI falls back to
    // the logged-out state instead of repeatedly hitting 401s.
    if (err.response?.status === 401 && localStorage.getItem('cm_token')) {
      localStorage.removeItem('cm_token')
      localStorage.removeItem('cm_user')
      if (!location.pathname.startsWith('/login')) {
        location.assign('/login')
      }
    }
    const msg = err.response?.data?.detail || err.message || 'Network error'
    return Promise.reject(new Error(msg))
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
}

export const healthApi = {
  check: () => api.get('/health'),
}
