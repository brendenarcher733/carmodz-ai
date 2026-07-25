import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'
import { AuthCard } from '../components/layout/AuthCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const [sent,  setSent]  = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Backend always returns the same generic response regardless of
      // whether the email exists — deliberate, prevents an attacker from
      // enumerating registered emails one guess at a time. The frontend
      // just shows whatever it gets, unconditionally.
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      {sent ? (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
            Check your email
          </h1>
          <p className="text-body text-sm mb-8">
            If an account exists for <span className="text-white">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
          </p>
          <Button to="/login" variant="secondary" size="xl" fullWidth>
            Back to sign in
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
            Reset your password
          </h1>
          <p className="text-body text-sm mb-8">Enter your email and we'll send you a reset link.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              size="xl"
              disabled={!email}
              loading={busy}
              className="mt-2"
            >
              Send reset link
            </Button>
          </form>

          <p className="text-center text-body text-sm mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:text-accent-bright transition-colors">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  )
}
