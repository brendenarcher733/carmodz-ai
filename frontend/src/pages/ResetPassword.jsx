import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../services/api'

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background — neutral atmospheric gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%),
            linear-gradient(180deg, #0a0b0d 0%, #08090b 100%)
          `,
        }}
      />

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

        {!token ? (
          <>
            <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
              Invalid link
            </h1>
            <p className="text-body text-sm mb-8">
              This password reset link is missing its token. Request a new one below.
            </p>
            <Link
              to="/forgot-password"
              className="w-full flex items-center justify-center gap-2 bg-accent text-obsidian font-display font-black text-base py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150"
            >
              Request a new link
            </Link>
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

              {error && (
                <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !form.password || !passwordsMatch}
                className="w-full flex items-center justify-center gap-2 bg-accent text-obsidian font-display font-black text-base py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {busy && <span className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />}
                Reset password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
