import { Link } from 'react-router-dom'
import { useBuilds } from '../hooks/useBuilds'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui/Spinner'
/* ─── Goal metadata ─── */
const GOAL_META = {
  'daily driver upgrades':    { label: 'Daily Driver',       color: '#22C55E', dim: 'rgba(34,197,94,0.08)'    },
  'budget performance build': { label: 'Budget Build',       color: '#F59E0B', dim: 'rgba(245,158,11,0.08)'   },
  'street performance':       { label: 'Street Performance', color: '#FF8C00', dim: 'rgba(255,140,0,0.08)'    },
  'track focused setup':      { label: 'Track Build',        color: '#EF4444', dim: 'rgba(239,68,68,0.08)'    },
  'cosmetic upgrades':        { label: 'Cosmetic',           color: '#A855F7', dim: 'rgba(168,85,247,0.08)'   },
  'sound upgrades':           { label: 'Sound Build',        color: '#3B82F6', dim: 'rgba(59,130,246,0.08)'   },
  'reliability first':        { label: 'Reliability',        color: '#22C55E', dim: 'rgba(34,197,94,0.08)'    },
  'max power':                { label: 'Max Power',          color: '#EF4444', dim: 'rgba(239,68,68,0.08)'    },
}

/* ─── Vehicle bay card ─── */
function GarageBay({ build, onDelete }) {
  const meta  = GOAL_META[build.goal] || { label: build.goal, color: '#FF8C00', dim: 'rgba(255,140,0,0.08)' }
  const since = new Date(build.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] group transition-all duration-300 hover:border-white/[0.14]"
      style={{ background: `linear-gradient(140deg, ${meta.dim} 0%, #131519 45%)` }}
    >
      {/* Left accent stripe */}
      <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: meta.color }} />

      <div className="pl-8 pr-6 py-7">
        <div className="flex items-start justify-between gap-6">

          {/* ── Left: Vehicle Identity ── */}
          <div className="flex-1 min-w-0">
            {/* Goal badge */}
            <div
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-lg mb-4"
              style={{ color: meta.color, background: meta.dim, border: `1px solid ${meta.color}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </div>

            {/* Vehicle name — THIS is the hero */}
            <h2
              className="font-display font-black text-white leading-[0.92] tracking-tight mb-1"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}
            >
              {build.year} {build.make}
            </h2>
            <h2
              className="font-display font-black leading-[0.92] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: meta.color }}
            >
              {build.model}
            </h2>

            {/* Vitals row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="font-display font-black text-white text-xl">${parseFloat(build.budget).toLocaleString()}</span>
                <span className="text-muted text-xs font-mono ml-1.5">budget</span>
              </div>
              <div className="h-3 w-px bg-white/[0.1]" />
              <span className="text-body capitalize">{build.experience} builder</span>
              <div className="h-3 w-px bg-white/[0.1]" />
              <span className="text-body">{build.is_daily ? 'Daily Driver' : 'Project Car'}</span>
              <div className="h-3 w-px bg-white/[0.1]" />
              <span className="text-muted text-xs font-mono">Since {since}</span>
            </div>
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <Link
              to={`/builds/${build.id}`}
              className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-black text-sm px-6 py-3 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow-sm whitespace-nowrap"
            >
              Continue Build
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <button
              onClick={() => onDelete(build.id)}
              className="text-muted text-xs font-mono hover:text-red-400 transition-colors px-2 py-1"
            >
              Remove from garage
            </button>
          </div>
        </div>

        {/* Categories pill row */}
        {build.categories?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/[0.05]">
            {build.categories.map(c => (
              <span key={c} className="text-[11px] font-mono text-muted bg-white/[0.04] px-2.5 py-1 rounded-lg capitalize">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Garage ─── */
export default function Garage() {
  const { builds, loading, error, deleteBuild } = useBuilds()
  const { user } = useAuth()

  const firstName = user?.name?.split(' ')[0] || null

  return (
    <div className="page-shell relative">
      {/* Garage background */}
      <div
        className="absolute top-0 inset-x-0 h-64 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to bottom,
              rgba(8,9,11,0.55) 0%,
              rgba(8,9,11,0.85) 50%,
              rgba(8,9,11,1)    100%
            ),
            url('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1920&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      />

      <div className="container-content py-12 relative z-10">

        {/* ── Header ── */}
        <div className="flex items-end justify-between mb-10">
          <div>
            {firstName && (
              <p className="eyebrow mb-2">Welcome back, {firstName}</p>
            )}
            <h1
              className="font-display font-black text-white leading-none tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}
            >
              My Garage
            </h1>
            {!loading && builds.length > 0 && (
              <p className="text-body mt-2">
                {builds.length} {builds.length === 1 ? 'build' : 'builds'} in progress
              </p>
            )}
          </div>

          <Link
            to="/planner"
            className="inline-flex items-center gap-2 bg-accent text-obsidian font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow-sm"
          >
            + New Build
          </Link>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center gap-3 py-24">
            <Spinner size="md" />
            <span className="text-body text-sm">Loading your garage…</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="bg-red-500/[0.07] border border-red-500/20 rounded-2xl p-6">
            <p className="text-red-400 text-sm">Could not load your builds: {error}</p>
          </div>
        )}

        {/* ── Empty Garage ── */}
        {!loading && !error && builds.length === 0 && (
          <div className="py-24">
            <div
              className="max-w-xl mx-auto text-center rounded-3xl border border-white/[0.06] py-20 px-10 relative overflow-hidden"
              style={{ background: 'rgba(19,21,25,0.5)' }}
            >
              {/* Decorative grid */}
              <div className="absolute inset-0 grid-texture opacity-50 pointer-events-none" />

              {/* Car icon */}
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-accent/[0.08] border border-accent/20 flex items-center justify-center mx-auto mb-8">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-accent">
                    <path d="M5 24h26M9 24l3-8h12l3 8M12 28a2 2 0 100-4 2 2 0 000 4zM24 28a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 16l2-5h6l2 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <h2 className="font-display font-black text-white text-3xl mb-3 tracking-tight">
                  Your garage is empty.
                </h2>
                <p className="text-body text-[15px] leading-relaxed mb-10 max-w-sm mx-auto">
                  Add your first vehicle and CarMods AI will build you
                  a personalized upgrade roadmap — stage by stage.
                </p>

                <Link
                  to="/planner"
                  className="inline-flex items-center gap-2.5 bg-accent text-obsidian font-display font-black text-base px-8 py-4 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow"
                >
                  Park Your First Vehicle
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Vehicle Bays ── */}
        {!loading && builds.length > 0 && (
          <div className="flex flex-col gap-4">
            {builds.map(b => (
              <GarageBay key={b.id} build={b} onDelete={deleteBuild} />
            ))}

            {/* Add another vehicle nudge */}
            <Link
              to="/planner"
              className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.1] py-6 text-muted text-sm hover:border-accent/30 hover:text-accent transition-all duration-200 group"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="group-hover:scale-110 transition-transform">
                <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add another vehicle
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
