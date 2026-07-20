import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'

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

        {sent ? (
          <>
            <h1 className="font-display font-black text-white text-2xl tracking-tight mb-1">
              Check your email
            </h1>
            <p className="text-body text-sm mb-8">
              If an account exists for <span className="text-white">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/[0.12] text-white font-display font-semibold text-base py-3.5 rounded-xl hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-150"
            >
              Back to sign in
            </Link>
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

              {error && (
                <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email}
                className="w-full flex items-center justify-center gap-2 bg-accent text-obsidian font-display font-black text-base py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {busy && <span className="w-4 h-4 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />}
                Send reset link
              </button>
            </form>

            <p className="text-center text-body text-sm mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-accent hover:text-accent-bright transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
