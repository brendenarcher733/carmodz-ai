import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../services/api'
import { Spinner } from '../components/ui/Spinner'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState(token ? 'verifying' : 'missing') // verifying | success | error | missing
  const [error,  setError]  = useState(null)

  useEffect(() => {
    if (!token) return
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => { setError(err.message); setStatus('error') })
  }, [token])

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
        className="relative z-10 w-full max-w-sm mx-4 animate-fade-up text-center"
        style={{
          background: 'rgba(13,14,19,0.88)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          padding: '2.5rem',
        }}
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-accent rounded-[7px] flex items-center justify-center text-obsidian font-mono font-black text-sm">C</div>
          <span className="font-display font-bold text-white tracking-tight">
            CarMods<span className="text-accent">AI</span>
          </span>
        </Link>

        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-6"><Spinner size="lg" /></div>
            <p className="text-body text-sm">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="font-display font-black text-white text-2xl tracking-tight mb-2">Email verified</h1>
            <p className="text-body text-sm mb-8">Your email address has been confirmed.</p>
            <Link
              to="/builds"
              className="w-full flex items-center justify-center gap-2 bg-accent text-obsidian font-display font-black text-base py-3.5 rounded-xl hover:bg-accent-bright transition-all duration-150"
            >
              Continue to CarMods AI
            </Link>
          </>
        )}

        {(status === 'error' || status === 'missing') && (
          <>
            <h1 className="font-display font-black text-white text-2xl tracking-tight mb-2">Verification failed</h1>
            <p className="text-body text-sm mb-8">
              {status === 'missing'
                ? 'This link is missing its verification token.'
                : (error || 'This link is invalid or has expired.')}
            </p>
            <Link
              to="/builds"
              className="w-full flex items-center justify-center gap-2 bg-white/[0.06] border border-white/[0.12] text-white font-display font-semibold text-base py-3.5 rounded-xl hover:bg-white/[0.1] hover:border-white/[0.2] transition-all duration-150"
            >
              Go to CarMods AI
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
