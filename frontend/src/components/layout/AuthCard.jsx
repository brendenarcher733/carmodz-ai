import { Link } from 'react-router-dom'
import { Logo } from './Logo'

/* Shared shell for Login/Signup/ForgotPassword/ResetPassword/VerifyEmail —
   the atmospheric background, glass card, and logo mark were byte-identical
   inline styles copy-pasted across all five pages. */
export function AuthCard({ children, className }) {
  return (
    <div className="auth-shell-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className={`auth-card relative z-10 w-full max-w-sm mx-4 p-6 sm:p-10 animate-fade-up ${className || ''}`}>
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <Logo size="sm" />
        </Link>
        {children}
      </div>
    </div>
  )
}
