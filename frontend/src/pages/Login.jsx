import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
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
      navigate('/builds')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background — night city car */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,140,0,0.06) 0%, transparent 55%),
            linear-gradient(to bottom, rgba(8,9,11,0.7) 0%, rgba(8,9,11,0.92) 100%),
            url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      />
      <div className="absolute inset-0 grid-texture opacity-30 pointer-events-none" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 animate-fade-up"
        style={{
          background: 'rgba(13,14,19,0.88)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          padding: '2.5rem',
        }}
      >
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-accent rounded-[7px] flex items-center justify-center text-obsidian font-mono font-black text-sm">C</div>
          <span className="font-display font-bold text-white tracking-tight">
            CarMods<span className="text-accent">AI</span>
          </span>
        </Link>

        <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
          Welcome back
        </h1>
        <p className="text-body text-sm mb-8">Sign in to your account to continue.</p>

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
              <span className="font-mono text-xs text-muted cursor-not-allowed">Forgot password?</span>
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

          {error && (
            <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !form.email || !form.password}
            className="w-full flex items-center justify-center gap-2 bg-accent text-obsidian font-display font-black text-base py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mt-2"
          >
            {busy && <span className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="text-center text-body text-sm mt-6">
          No account?{' '}
          <Link to="/signup" className="text-accent hover:text-accent-bright transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
