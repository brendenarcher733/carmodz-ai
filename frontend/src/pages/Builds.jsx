import { Link } from 'react-router-dom'
import { useBuilds } from '../hooks/useBuilds'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import s from './Builds.module.css'

const CAT_ICONS = { performance:'🔥', handling:'🎯', sound:'🔊', cosmetic:'✨', reliability:'🔩', interior:'🪑' }
const EXP_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

function BuildCard({ build, onDelete }) {
  const date = new Date(build.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  return (
    <Card hover className={`${s.buildCard} animate-fade-up`}>
      <div className={s.cardTop}>
        <div className={s.vehicleInfo}>
          <h3 className={s.buildTitle}>{build.title || `${build.year} ${build.make} ${build.model}`}</h3>
          <p className={s.vehicle}>{build.year} {build.make} {build.model}</p>
        </div>
        <div className={s.buildBudget}>${parseFloat(build.budget).toLocaleString()}</div>
      </div>
      <div className={s.buildMeta}>
        <Badge variant={EXP_VARIANT[build.experience] || 'default'} size="sm">
          {build.experience}
        </Badge>
        <Badge variant="default" size="sm">{build.is_daily ? '🚗 Daily' : '🔧 Project'}</Badge>
        {build.categories?.slice(0, 3).map(c => (
          <Badge key={c} variant="default" size="sm">{CAT_ICONS[c] || ''} {c}</Badge>
        ))}
      </div>
      <p className={s.goal}>{build.goal}</p>
      <div className={s.cardActions}>
        <span className={s.date}>{date}</span>
        <div className={s.btns}>
          <Link to={`/builds/${build.id}`}><Button size="sm">View Plan →</Button></Link>
          <Button size="sm" variant="danger" onClick={() => onDelete(build.id)}>Delete</Button>
        </div>
      </div>
    </Card>
  )
}

export default function Builds() {
  const { builds, loading, error, deleteBuild } = useBuilds()

  return (
    <div className={s.page}>
      <div className="container">
        <div className={s.header}>
          <div>
            <p className={s.eyebrow}>// MY GARAGE</p>
            <h1 className={s.title}>Saved Builds</h1>
          </div>
          <Link to="/planner"><Button>+ New Build</Button></Link>
        </div>

        {loading && <div className={s.center}><Spinner size="lg" /></div>}

        {error && (
          <Card className={s.errorCard}>
            <p className={s.errorText}>Failed to load builds: {error}</p>
          </Card>
        )}

        {!loading && !error && builds.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>🚗</div>
            <h2 className={s.emptyTitle}>No builds yet</h2>
            <p className={s.emptySub}>Start your first build plan and it'll show up here.</p>
            <Link to="/planner"><Button size="lg">Start a Build →</Button></Link>
          </div>
        )}

        {!loading && builds.length > 0 && (
          <div className={s.grid}>
            {builds.map(b => <BuildCard key={b.id} build={b} onDelete={deleteBuild} />)}
          </div>
        )}
      </div>
    </div>
  )
}
