import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../services/api'
import * as analytics from '../services/analytics'
import { Spinner } from '../components/ui/Spinner'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import { TrafficChart } from '../components/analytics/TrafficChart'
import { TopPagesBars } from '../components/analytics/TopPagesBars'

const RANGES = [
  { days: 7,  label: '7 days'  },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

function StatTile({ label, value }) {
  return (
    <Card padding="md" className="text-center">
      <div className="font-display font-black text-white text-2xl leading-none mb-1.5">{value}</div>
      <div className="text-muted text-xs font-mono uppercase tracking-widest">{label}</div>
    </Card>
  )
}

function NotConfigured() {
  return (
    <Alert variant="info">
      <p className="font-medium mb-1">PostHog isn't connected for traffic data yet.</p>
      <p className="text-body">
        Add <code className="font-mono text-xs bg-white/[0.08] px-1.5 py-0.5 rounded">POSTHOG_PROJECT_ID</code> and{' '}
        <code className="font-mono text-xs bg-white/[0.08] px-1.5 py-0.5 rounded">POSTHOG_PERSONAL_API_KEY</code> to the
        backend's environment (found under PostHog → Settings → Project, and Settings → Personal API Keys with query-read
        scope) to enable this page.
      </p>
    </Alert>
  )
}

export default function Analytics() {
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { analytics.capture('admin_analytics_viewed') }, [])

  const load = useCallback(async (daysArg) => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminApi.traffic(daysArg))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(days) }, [load, days])

  const avgViewsPerVisitor = data?.totals?.visitors
    ? (data.totals.pageviews / data.totals.visitors).toFixed(1)
    : '—'

  return (
    <div className="page-shell relative">
      <div
        className="absolute top-0 inset-x-0 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 65%)' }}
      />

      <div className="container-content py-6 md:py-12 relative z-10">

        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-2">Internal</p>
            <h1
              className="font-display font-black text-white leading-none tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}
            >
              Analytics
            </h1>
            <p className="text-body mt-2">Real site traffic, pulled live from PostHog.</p>
          </div>
          <Link to="/admin" className="font-mono text-xs text-muted hover:text-white uppercase tracking-wider transition-colors mt-2">
            ← Admin Dashboard
          </Link>
        </div>

        {/* Date range — one row, above everything it scopes. */}
        <div className="flex items-center gap-2 mb-8">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={
                r.days === days
                  ? 'font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl bg-white/[0.1] text-white border border-white/[0.15]'
                  : 'font-mono text-xs uppercase tracking-wider px-4 py-2 rounded-xl text-muted hover:text-white hover:bg-white/[0.05] border border-transparent transition-colors'
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div className="flex items-center gap-3 py-24">
            <Spinner size="md" />
            <span className="text-body text-sm">Loading traffic…</span>
          </div>
        )}

        {error && !loading && <Alert variant="error">{error}</Alert>}

        {!error && data && !data.configured && <NotConfigured />}

        {!error && data?.configured && (
          <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <StatTile label="Page Views"        value={data.totals.pageviews.toLocaleString()} />
              <StatTile label="Unique Visitors"   value={data.totals.visitors.toLocaleString()} />
              <StatTile label="Views / Visitor"   value={avgViewsPerVisitor} />
            </div>

            <Card padding="lg" className="mb-8">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-5">
                Traffic Over Time
              </h2>
              <TrafficChart daily={data.daily} />
            </Card>

            <Card padding="lg">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-5">
                Top Pages
              </h2>
              <TopPagesBars pages={data.top_pages} />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
