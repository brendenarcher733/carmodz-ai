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

export function useBuildPlan(buildId) {
  const [plan, setPlan]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!buildId) return
    setLoading(true); setError(null)
    buildsApi.getPlan(buildId)
      .then(setPlan)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [buildId])

  return { plan, loading, error }
}
