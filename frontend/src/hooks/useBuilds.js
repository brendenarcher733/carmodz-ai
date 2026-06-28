import { useState, useEffect, useCallback } from 'react'
import { buildsApi } from '../services/api'

export function useBuilds() {
  const [builds, setBuilds]   = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchBuilds = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [list, garageStats] = await Promise.all([
        buildsApi.list(),
        buildsApi.stats(),
      ])
      setBuilds(list)
      setStats(garageStats)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBuilds() }, [fetchBuilds])

  const deleteBuild = useCallback(async (id) => {
    try {
      await buildsApi.delete(id)
      setBuilds(prev => prev.filter(b => b.id !== id))
      setStats(prev => prev ? { ...prev, total_builds: prev.total_builds - 1 } : prev)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const toggleFavourite = useCallback(async (id) => {
    try {
      const updated = await buildsApi.toggleFavourite(id)
      setBuilds(prev => prev.map(b => b.id === id ? updated : b))
      setStats(prev => {
        if (!prev) return prev
        const delta = updated.is_favourite ? 1 : -1
        return { ...prev, favourites: prev.favourites + delta }
      })
    } catch (e) {
      setError(e.message)
    }
  }, [])

  return { builds, stats, loading, error, refetch: fetchBuilds, deleteBuild, toggleFavourite }
}

const TERMINAL_STATUSES = ['ready', 'failed']

// Polls the lightweight /status endpoint (not the full build, not the plan)
// while recommendation generation is in flight. Stops itself once the build
// reaches a terminal status — there's nothing left worth polling for.
export function useBuildStatus(buildId, { pollMs = 1500 } = {}) {
  const [status, setStatus] = useState(null)
  const [error, setError]   = useState(null)
  // Bumped by retry() to force the polling effect to restart — the poll loop
  // below stops scheduling itself once it sees a terminal status, so without
  // this a retry's status='pending' write would never resume polling.
  const [pollGen, setPollGen] = useState(0)

  useEffect(() => {
    if (!buildId) return
    let cancelled = false
    let timer = null

    const poll = async () => {
      try {
        const s = await buildsApi.getStatus(buildId)
        if (cancelled) return
        setStatus(s)
        if (!TERMINAL_STATUSES.includes(s.status)) {
          timer = setTimeout(poll, pollMs)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }
    poll()

    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [buildId, pollMs, pollGen])

  const retry = useCallback(async () => {
    if (!buildId) return
    setError(null)
    try {
      const updated = await buildsApi.retry(buildId)
      setStatus(updated)
      setPollGen(g => g + 1)
    } catch (e) {
      setError(e.message)
    }
  }, [buildId])

  return { status, error, retry }
}

// Fetches the full plan exactly once, only when enabled (i.e. once
// useBuildStatus reports status='ready') — separate from status polling so
// the heavy plan payload isn't re-fetched on every poll tick.
export function useBuildPlan(buildId, { enabled = true } = {}) {
  const [plan, setPlan]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!buildId || !enabled) return
    setLoading(true); setError(null)
    buildsApi.getPlan(buildId)
      .then(setPlan)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [buildId, enabled])

  return { plan, loading, error }
}
