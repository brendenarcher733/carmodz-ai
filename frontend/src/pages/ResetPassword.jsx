import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../services/api'
import { AuthCard } from '../components/layout/AuthCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [form,  setForm]  = useState({ password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const passwordsMatch = form.password === form.confirm

  const handleSubmit = async e => {
    e.preventDefault()
    if (!passwordsMatch) return
    setBusy(true)
    setError(null)
    try {
      await authApi.resetPassword(token, form.password)
      navigate('/login', { replace: true, state: { resetSuccess: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      {!token ? (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
            Invalid link
          </h1>
          <p className="text-body text-sm mb-8">
            This password reset link is missing its token. Request a new one below.
          </p>
          <Button to="/forgot-password" size="xl" fullWidth>
            Request a new link
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
            Set a new password
          </h1>
          <p className="text-body text-sm mb-8">Choose a new password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">New Password <span className="text-muted normal-case tracking-normal">(min. 8 characters)</span></label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div>
              <label className="field-label">Confirm New Password</label>
              <input
                className={`field-input ${form.confirm && !passwordsMatch ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                required
                autoComplete="new-password"
              />
              {form.confirm && !passwordsMatch && (
                <p className="mt-1.5 text-red-400 text-xs font-mono">Passwords don't match</p>
              )}
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              size="xl"
              disabled={!form.password || !passwordsMatch}
              loading={busy}
              className="mt-2"
            >
              Reset password
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  )
}
