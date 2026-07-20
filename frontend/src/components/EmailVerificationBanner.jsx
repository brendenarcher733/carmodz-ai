import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Fixed, stacked directly below the fixed Navbar (which is h-20 / 5rem).
// page-shell (globals.css) reads --page-shell-offset for its top padding —
// this component is the only thing that ever changes it, bumping it up by
// this banner's own height while shown and resetting it when it isn't, so
// every page's content correctly clears both the navbar and the banner
// without every individual page needing to know the banner exists.
const BANNER_HEIGHT_REM = 2.75

export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth()
  const [sent, setSent]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  const visible = !!user && !emailVerified

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--page-shell-offset',
      visible ? `${5 + BANNER_HEIGHT_REM}rem` : '5rem',
    )
    return () => document.documentElement.style.setProperty('--page-shell-offset', '5rem')
  }, [visible])

  if (!visible) return null

  const handleResend = async () => {
    setBusy(true)
    setError(null)
    try {
      await resendVerification()
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-x-0 z-40 flex items-center"
      style={{
        top: '5rem',
        height: `${BANNER_HEIGHT_REM}rem`,
        background: 'rgba(255,140,0,0.06)',
        borderBottom: '1px solid rgba(255,140,0,0.15)',
      }}
    >
      <div className="container-content w-full flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body truncate">
          <span className="text-accent font-medium">Please verify your email.</span>{' '}
          {sent ? 'Check your inbox for a new link.' : `We sent a link to ${user.email}.`}
          {error && <span className="text-red-400 ml-2">{error}</span>}
        </p>
        {!sent && (
          <button
            onClick={handleResend}
            disabled={busy}
            className="text-sm font-medium text-accent hover:text-accent-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {busy ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </div>
    </div>
  )
}
