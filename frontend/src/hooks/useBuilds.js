import { useState, useEffect, useCallback } from 'react'
import { buildsApi } from '../services/api'

export function useBuilds() {
  const [builds, setBuilds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchBuilds = useCallback(async () => {
    setLoading(true); setError(null)
    try { setBuilds(await buildsApi.list()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBuilds() }, [fetchBuilds])

  const deleteBuild = useCallback(async (id) => {
    try { await buildsApi.delete(id); setBuilds(prev => prev.filter(b => b.id !== id)) }
    catch (e) { setError(e.message) }
  }, [])

  return { builds, loading, error, refetch: fetchBuilds, deleteBuild }
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
