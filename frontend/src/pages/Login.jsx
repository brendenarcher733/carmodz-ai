import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthCard } from '../components/layout/AuthCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const [form,  setForm]  = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(form.email, form.password)
      const dest = location.state?.from?.pathname || '/builds'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
        Welcome back
      </h1>
      <p className="text-body text-sm mb-8">Sign in to your account to continue.</p>

      {location.state?.resetSuccess && (
        <Alert variant="success" className="mb-4">
          Password reset — sign in with your new password.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Password</label>
            <Link to="/forgot-password" className="font-mono text-xs text-muted hover:text-accent transition-colors">Forgot password?</Link>
          </div>
          <input
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          fullWidth
          size="xl"
          disabled={!form.email || !form.password}
          loading={busy}
          className="mt-2"
        >
          Sign In
        </Button>
      </form>

      <p className="text-center text-body text-sm mt-6">
        No account?{' '}
        <Link to="/signup" className="text-accent hover:text-accent-bright transition-colors">
          Create one free
        </Link>
      </p>
    </AuthCard>
  )
}
