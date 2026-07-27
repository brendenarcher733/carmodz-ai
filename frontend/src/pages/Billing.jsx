import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { billingApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'

function UsageRow({ label, used, limit }) {
  const unlimited = limit == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-body text-sm">{label}</span>
        <span className="font-mono text-xs text-muted">
          {unlimited ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={pct >= 100 ? 'h-full bg-red-400 rounded-full' : 'h-full bg-accent rounded-full'}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function Billing() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    billingApi.usage()
      .then(setUsage)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const isPro = user?.plan === 'pro'
  const success = searchParams.get('success') === '1'
  const canceled = searchParams.get('canceled') === '1'

  const handleUpgrade = async () => {
    setBusy(true)
    setError(null)
    try {
      const { url } = await billingApi.checkout()
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const handleManage = async () => {
    setBusy(true)
    setError(null)
    try {
      const { url } = await billingApi.portal()
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="page-shell relative">
      <div
        className="absolute top-0 inset-x-0 h-64 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 65%)',
        }}
      />

      <div className="container-content py-12 max-w-2xl relative z-10">
        <div className="mb-8">
          <p className="eyebrow mb-2">Account</p>
          <h1
            className="font-display font-black text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}
          >
            Billing
          </h1>
          <p className="text-body mt-2">Manage your plan and see today's usage.</p>
        </div>

        {success && (
          <Alert variant="success" className="mb-6">
            You're on Pro. Unlimited builds and advisor chat, priority build generation.
          </Alert>
        )}
        {canceled && (
          <Alert variant="info" className="mb-6">
            Checkout was canceled — you're still on the Free plan.
          </Alert>
        )}
        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {loading ? (
          <div className="flex items-center gap-3 py-16">
            <Spinner size="md" />
            <span className="text-body text-sm">Loading your plan…</span>
          </div>
        ) : (
          <div className="space-y-4">
            <Card padding="lg">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-white text-lg">
                      {isPro ? 'Pro' : 'Free'}
                    </span>
                    <Badge variant={isPro ? 'accent' : 'default'} size="sm">
                      {isPro ? '$10/mo' : 'current plan'}
                    </Badge>
                  </div>
                  {isPro && usage?.subscription_cancel_at && (
                    <p className="text-muted text-xs font-mono">
                      Cancels on {new Date(usage.subscription_cancel_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {isPro ? (
                  <Button variant="secondary" size="md" onClick={handleManage} loading={busy}>
                    Manage subscription
                  </Button>
                ) : (
                  <Button size="md" onClick={handleUpgrade} loading={busy}>
                    Upgrade to Pro
                  </Button>
                )}
              </div>

              {usage && (
                <div className="space-y-4 pt-5 border-t border-white/[0.05]">
                  <UsageRow label="Saved builds" used={usage.builds_used} limit={usage.builds_limit} />
                  <UsageRow label="Advisor messages today" used={usage.chat_messages_used_today} limit={usage.chat_messages_limit} />
                </div>
              )}
            </Card>

            {!isPro && (
              <Card padding="lg">
                <p className="eyebrow mb-3">Pro — $10/mo</p>
                <ul className="space-y-2 text-sm text-body">
                  <li>Unlimited saved builds</li>
                  <li>Unlimited advisor chat</li>
                  <li>Priority position in the build queue</li>
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
