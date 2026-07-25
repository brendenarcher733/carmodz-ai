import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as analytics from '../services/analytics'
import { AuthCard } from '../components/layout/AuthCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'

export default function Signup() {
  const { signup }  = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const [form,  setForm]  = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  useEffect(() => { analytics.capture('signup_form_viewed') }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const passwordsMatch = form.password === form.confirm
  const canSubmit      = form.name && form.email && form.password.length >= 8 && passwordsMatch

  const handleSubmit = async e => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    analytics.capture('signup_submitted')
    try {
      await signup(form.name, form.email, form.password)
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
        Create your account
      </h1>
      <p className="text-body text-sm mb-8">Free forever. No credit card required.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Full Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="Alex Johnson"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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
          <label className="field-label">Password <span className="text-muted normal-case tracking-normal">(min. 8 characters)</span></label>
          <input
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="field-label">Confirm Password</label>
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
          disabled={!canSubmit}
          loading={busy}
          className="mt-2"
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-body text-sm mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:text-accent-bright transition-colors">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
