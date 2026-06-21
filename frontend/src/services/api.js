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
    const msg = err.response?.data?.detail || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export const buildsApi = {
  create:          (data) => api.post('/api/builds/', data, { timeout: 90000 }),
  list:            ()     => api.get('/api/builds/'),
  get:             (id)   => api.get(`/api/builds/${id}`),
  getPlan:         (id)   => api.get(`/api/builds/${id}/plan`),
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
