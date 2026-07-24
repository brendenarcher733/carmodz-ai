import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../services/api'
import * as analytics from '../services/analytics'
import { Spinner } from '../components/ui/Spinner'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const PAGE_SIZE = 50

/* ─── Stats cards ─── */
const STAT_META = [
  { key: 'total_users',         label: 'Total Users'         },
  { key: 'active_users',        label: 'Active Users'        },
  { key: 'total_builds',        label: 'Total Builds'        },
  { key: 'total_ai_requests',   label: 'Total AI Requests'   },
  { key: 'new_users_this_week', label: 'New This Week'       },
  {
    key: 'avg_ai_response_time_ms',
    label: 'Avg AI Response',
    format: (v) => (v == null ? '—' : `${(v / 1000).toFixed(1)}s`),
  },
]

function StatsRow({ stats }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {STAT_META.map(({ key, label, format }) => (
        <Card key={key} padding="md" className="text-center">
          <div className="font-display font-black text-white text-2xl leading-none mb-1.5">
            {format ? format(stats[key]) : (stats[key]?.toLocaleString?.() ?? stats[key])}
          </div>
          <div className="text-muted text-xs font-mono uppercase tracking-widest">{label}</div>
        </Card>
      ))}
    </div>
  )
}

function PopularVehicles({ vehicles }) {
  if (!vehicles || vehicles.length === 0) return null
  return (
    <Card padding="lg" className="mb-8">
      <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-4">
        Top Vehicles
      </h2>
      <div className="space-y-2.5">
        {vehicles.map((v, i) => (
          <div key={`${v.make}-${v.model}`} className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted w-4">{i + 1}</span>
            <span className="text-body text-sm flex-1">{v.make} {v.model}</span>
            <span className="font-mono text-xs text-muted">{v.count} build{v.count === 1 ? '' : 's'}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function StatusBadges({ user }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
        {user.is_active ? 'Active' : 'Disabled'}
      </Badge>
      <Badge variant={user.email_verified ? 'default' : 'warning'} size="sm">
        {user.email_verified ? 'Verified' : 'Unverified'}
      </Badge>
      {user.is_admin && <Badge variant="accent" size="sm">Admin</Badge>}
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ─── Main page ─── */
export default function Admin() {
  const [stats, setStats]       = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { analytics.capture('admin_dashboard_viewed') }, [])

  const load = useCallback(async (pageArg, searchArg) => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, usersData, vehiclesData] = await Promise.all([
        adminApi.stats(),
        adminApi.users({ skip: pageArg * PAGE_SIZE, limit: PAGE_SIZE, search: searchArg }),
        adminApi.popularVehicles(),
      ])
      setStats(statsData)
      setUsers(usersData.users)
      setTotal(usersData.total)
      setVehicles(vehiclesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, search) }, [load, page])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(0)
    load(0, search)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page-shell relative">
      <div
        className="absolute top-0 inset-x-0 h-64 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 65%)',
        }}
      />

      <div className="container-content py-12 relative z-10">

        <div className="mb-8">
          <p className="eyebrow mb-2">Internal</p>
          <h1
            className="font-display font-black text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}
          >
            Admin Dashboard
          </h1>
          <p className="text-body mt-2">Platform users and usage, at a glance.</p>
        </div>

        {loading && !stats && (
          <div className="flex items-center gap-3 py-24">
            <Spinner size="md" />
            <span className="text-body text-sm">Loading dashboard…</span>
          </div>
        )}

        {error && !loading && (
          <Card padding="lg" className="text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </Card>
        )}

        {!error && stats && (
          <>
            <StatsRow stats={stats} />
            <PopularVehicles vehicles={vehicles} />

            <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 max-w-sm bg-surface border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:border-white/[0.2] transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-body hover:text-white bg-white/[0.05] hover:bg-white/[0.08] rounded-xl transition-colors"
              >
                Search
              </button>
            </form>

            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left">
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">User</th>
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">Signed Up</th>
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">Last Login</th>
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">Builds</th>
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">AI Requests</th>
                      <th className="px-5 py-3 text-muted text-xs font-mono uppercase tracking-widest font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="font-mono text-xs text-muted">{user.email}</div>
                        </td>
                        <td className="px-5 py-3.5 text-body">{formatDate(user.created_at)}</td>
                        <td className="px-5 py-3.5 text-body">{formatDate(user.last_login_at)}</td>
                        <td className="px-5 py-3.5 text-body font-mono">{user.build_count}</td>
                        <td className="px-5 py-3.5 text-body font-mono">{user.ai_request_count}</td>
                        <td className="px-5 py-3.5"><StatusBadges user={user} /></td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted text-sm">
                          No users match this search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 text-sm">
                <span className="text-muted">
                  Page {page + 1} of {totalPages} · {total} users
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 text-body hover:text-white bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 text-body hover:text-white bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
