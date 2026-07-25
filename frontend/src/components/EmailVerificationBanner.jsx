import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Fixed, stacked directly below the fixed Navbar (which is h-20 / 5rem).
// page-shell (globals.css) reads --page-shell-offset for its top padding —
// this component is the only thing that ever changes it, bumping it up by
// this banner's own *real, measured* height while shown (via ResizeObserver,
// not a hardcoded constant — on a narrow phone the content can wrap to two
// lines, and a fixed constant would let page content overlap the wrapped
// second line) and resetting it when it isn't, so every page's content
// correctly clears both the navbar and the banner without every individual
// page needing to know the banner exists.
export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth()
  const [sent, setSent]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const ref = useRef(null)

  const visible = !!user && !emailVerified

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty('--page-shell-offset', '5rem')
      return
    }
    const el = ref.current
    if (!el) return
    const update = () => {
      document.documentElement.style.setProperty(
        '--page-shell-offset', `calc(5rem + ${el.offsetHeight}px)`,
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty('--page-shell-offset', '5rem')
    }
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
      ref={ref}
      className="fixed inset-x-0 z-40 bg-accent/[0.06] border-b border-accent/[0.15]"
      style={{ top: '5rem' }}
    >
      <div className="container-content w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2.5">
        <p className="text-sm text-body">
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
