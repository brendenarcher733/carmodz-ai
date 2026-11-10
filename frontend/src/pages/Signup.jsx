import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthCard } from '../components/layout/AuthCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import * as analytics from '../services/analytics'

export default function Signup() {
  const { signup }  = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const [form,  setForm]  = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  // Landing on this page is the signal — same semantics the old /signup
  // redirect tracked, now firing on a real page instead of a bounce to /login.
  useEffect(() => { analytics.capture('signup_started') }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setBusy(true)
    setError(null)
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
      <p className="text-body text-sm mb-8">Free to start. No credit card required.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="Your name"
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
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button
          type="submit"
          fullWidth
          size="xl"
          disabled={!form.name || !form.email || !form.password}
          loading={busy}
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      <p className="text-muted text-sm text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  )
}
