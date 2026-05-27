import { useParams, Link } from 'react-router-dom'
import { useBuildPlan } from '../hooks/useBuilds'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import s from './BuildDetail.module.css'
import clsx from 'clsx'

const DIFF_VARIANT = { easy: 'easy', medium: 'medium', hard: 'hard' }
const STAGE_VARIANT = { 1: 'stage1', 2: 'stage2', 3: 'stage3' }
const CAT_ICONS = { performance:'🔥', handling:'🎯', sound:'🔊', cosmetic:'✨', reliability:'🔩', interior:'🪑' }

function BudgetBar({ spent, budget }) {
  const pct = Math.min((spent / budget) * 100, 100)
  const over = spent > budget
  return (
    <div className={s.budgetBar}>
      <div className={s.budgetBarTrack}>
        <div className={clsx(s.budgetBarFill, over && s.budgetBarOver)} style={{ width: `${pct}%` }} />
      </div>
      <div className={s.budgetLabels}>
        <span className={s.budgetSpent}>${spent.toLocaleString()} avg spend</span>
        <span className={s.budgetTotal}>of ${budget.toLocaleString()}</span>
      </div>
    </div>
  )
}

function ModCard({ mod, index }) {
  return (
    <div className={`${s.modCard} animate-fade-up`} style={{ animationDelay: `${index * 40}ms` }}>
      <div className={s.modTop}>
        <div className={s.modLeft}>
          <span className={s.modCatIcon}>{CAT_ICONS[mod.category] || '🔧'}</span>
          <div>
            <div className={s.modName}>{mod.name}</div>
            <div className={s.modCat}>{mod.category}</div>
          </div>
        </div>
        <div className={s.modBadges}>
          <Badge variant={DIFF_VARIANT[mod.difficulty] || 'default'} size="sm">
            {mod.difficulty}
          </Badge>
          <Badge variant={STAGE_VARIANT[mod.stage] || 'default'} size="sm">
            Stage {mod.stage}
          </Badge>
        </div>
      </div>
      <p className={s.modDesc}>{mod.description}</p>
      <div className={s.modFooter}>
        <div className={s.modPrice}>
          <span className={s.priceLabel}>Est. Cost</span>
          <span className={s.priceVal}>${mod.price_min.toLocaleString()} – ${mod.price_max.toLocaleString()}</span>
        </div>
        <div className={s.modPriority}>
          <span className={s.priorityLabel}>Priority</span>
          <span className={s.priorityNum}>#{mod.priority}</span>
        </div>
      </div>
      {mod.brand_tips?.length > 0 && (
        <div className={s.brands}>
          <span className={s.brandsLabel}>Brands: </span>
          {mod.brand_tips.join(' · ')}
        </div>
      )}
      {mod.warnings?.length > 0 && (
        <div className={s.warnings}>
          {mod.warnings.map((w, i) => (
            <div key={i} className={s.warning}>⚠️ {w}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function StageRoadmap({ breakdown }) {
  const stages = Object.entries(breakdown)
  const colors = { 'Stage 1': 'var(--stage1)', 'Stage 2': 'var(--stage2)', 'Stage 3': 'var(--stage3)' }
  return (
    <div className={s.roadmap}>
      {stages.map(([stage, mods]) => (
        <div key={stage} className={s.roadmapStage}>
          <div className={s.roadmapHeader} style={{ borderColor: colors[stage] }}>
            <span className={s.roadmapTitle} style={{ color: colors[stage] }}>{stage}</span>
            <span className={s.roadmapCount}>{mods.length} mod{mods.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className={s.roadmapList}>
            {mods.map(m => <li key={m} className={s.roadmapItem}>{m}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function BuildDetail() {
  const { id } = useParams()
  const { plan, loading, error } = useBuildPlan(id)

  if (loading) return (
    <div className={s.center}>
      <Spinner size="lg" />
      <p className={s.loadingText}>Loading your build plan...</p>
    </div>
  )

  if (error) return (
    <div className={s.center}>
      <div className={s.errorBox}>
        <p className={s.errorTitle}>Couldn't load this build</p>
        <p className={s.errorMsg}>{error}</p>
        <Link to="/builds"><Button variant="secondary">← My Builds</Button></Link>
      </div>
    </div>
  )

  if (!plan) return null

  const avgSpend = (plan.total_min + plan.total_max) / 2
  const stageMods = { 1: [], 2: [], 3: [] }
  plan.mods.forEach(m => { if (stageMods[m.stage]) stageMods[m.stage].push(m) })

  return (
    <div className={s.page}>
      <div className="container">
        {/* Header */}
        <div className={s.header}>
          <Link to="/builds" className={s.back}>← My Builds</Link>
          <div className={s.headerMain}>
            <h1 className={s.title}>Build Plan</h1>
            <Link to="/advisor"><Button variant="secondary" size="sm">💬 Ask Advisor</Button></Link>
          </div>
          <p className={s.summary}>{plan.summary}</p>
        </div>

        {/* Budget + stage overview */}
        <div className={s.overviewGrid}>
          <Card padding="lg">
            <p className={s.cardLabel}>Budget Breakdown</p>
            <BudgetBar spent={avgSpend} budget={/* we only have plan, not build */avgSpend * 1.1} />
            <div className={s.budgetStats}>
              <div><span className={s.statVal}>${plan.total_min.toLocaleString()}</span><span className={s.statLabel}>Min</span></div>
              <div><span className={s.statVal}>${plan.total_max.toLocaleString()}</span><span className={s.statLabel}>Max</span></div>
              <div><span className={s.statVal}>{plan.mods.length}</span><span className={s.statLabel}>Mods</span></div>
            </div>
            {plan.budget_warning && <div className={s.budgetAlert}>{plan.budget_warning}</div>}
          </Card>

          <Card padding="lg">
            <p className={s.cardLabel}>Stage Roadmap</p>
            <StageRoadmap breakdown={plan.stage_breakdown} />
          </Card>
        </div>

        {/* Mods by stage */}
        {[1, 2, 3].map(stageNum => {
          const mods = stageMods[stageNum]
          if (!mods.length) return null
          const stageColors = { 1: 'var(--stage1)', 2: 'var(--stage2)', 3: 'var(--stage3)' }
          return (
            <section key={stageNum} className={s.stageSection}>
              <div className={s.stageHeader}>
                <div className={s.stageDot} style={{ background: stageColors[stageNum] }} />
                <h2 className={s.stageTitle} style={{ color: stageColors[stageNum] }}>Stage {stageNum}</h2>
                <span className={s.stageDesc}>
                  {stageNum === 1 ? 'Start here — best ROI, easiest to do' :
                   stageNum === 2 ? 'After Stage 1 is solid — bigger gains' :
                   'Advanced upgrades — biggest impact, most complexity'}
                </span>
                <div className={s.stageLine} />
              </div>
              <div className={s.modsGrid}>
                {mods.map((mod, i) => <ModCard key={mod.name} mod={mod} index={i} />)}
              </div>
            </section>
          )
        })}

        {/* Actions */}
        <div className={s.actions}>
          <Link to="/planner"><Button variant="ghost">+ New Build</Button></Link>
          <Link to="/advisor"><Button variant="secondary">💬 Ask Follow-Up</Button></Link>
        </div>
      </div>
    </div>
  )
}
