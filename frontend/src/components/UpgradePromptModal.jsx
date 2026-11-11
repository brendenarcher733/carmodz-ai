import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/Button'
import * as analytics from '../services/analytics'

/**
 * Two distinct triggers share this modal:
 *  - an anonymous user's second preview attempt (Planner.jsx, !user branch)
 *  - an already-logged-in free user's second saved build, a real 403 from
 *    the backend (services/billing_service.enforce_build_limit)
 * The copy and CTA have to differ: "Create account" / "Sign in" make no
 * sense to someone who already has a session — they just need to pay.
 */
export default function UpgradePromptModal({ onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSignup = () => {
    analytics.capture('upgrade_prompt_signup_clicked')
    navigate('/signup', { state: { from: { pathname: '/billing' } } })
  }

  const handleLogin = () => {
    analytics.capture('upgrade_prompt_login_clicked')
    navigate('/login', { state: { from: { pathname: '/billing' } } })
  }

  const handleUpgrade = () => {
    analytics.capture('upgrade_prompt_billing_clicked')
    navigate('/billing')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/95 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display font-black text-white text-xl tracking-tight mb-2">
          {user ? "You've reached your free build limit" : "You've used your free plan"}
        </h2>
        <p className="text-body text-sm mb-6">
          Unlock unlimited build plans for{' '}
          <span className="text-white font-semibold">$5/month</span>.
          No commitments, cancel anytime.
        </p>

        <div className="space-y-3">
          {user ? (
            <Button fullWidth size="xl" onClick={handleUpgrade}>
              Upgrade to Pro
            </Button>
          ) : (
            <>
              <Button fullWidth size="xl" onClick={handleSignup}>
                Create account
              </Button>
              <button
                onClick={handleLogin}
                className="w-full text-center text-sm text-muted hover:text-white transition-colors"
              >
                Already have an account? Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
