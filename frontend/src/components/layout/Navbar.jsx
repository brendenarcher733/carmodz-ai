import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Logo } from './Logo'
import { IconGarageBay, IconFuelPump } from '../icons/AutoIcons'
import clsx from 'clsx'

const NAV_LINKS = [
  { to: '/',        label: 'Home'          },
  { to: '/planner', label: 'Build Planner' },
  { to: '/builds',  label: 'My Builds'     },
  { to: '/advisor', label: 'Mod Advisor'   },
]

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 group"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/[0.12] border border-accent/25 flex items-center justify-center text-accent font-display font-bold text-xs select-none">
          {initials}
        </div>
        <span className="hidden md:block text-sm text-body group-hover:text-white transition-colors font-medium max-w-[120px] truncate">
          {user.name.split(' ')[0]}
        </span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={clsx('text-muted transition-transform duration-150', open && 'rotate-180')}>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="glass-strong absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 py-1">
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <div className="font-display font-semibold text-white text-sm truncate">{user.name}</div>
            <div className="font-mono text-xs text-muted truncate">{user.email}</div>
          </div>
          <div className="py-1">
            <Link
              to="/builds"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <IconGarageBay width={14} height={14} strokeWidth={1.25} className="text-muted" />
              My Builds
            </Link>
            <Link
              to="/billing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <IconFuelPump width={14} height={14} strokeWidth={1.25} className="text-muted" />
              Billing
            </Link>
            <button
              onClick={() => { onLogout(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted">
                <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { pathname }       = useLocation()
  const navigate           = useNavigate()
  const { user, logout }   = useAuth()

  const navLinks = user?.is_admin
    ? [...NAV_LINKS, { to: '/admin', label: 'Admin' }]
    : NAV_LINKS

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* Main bar */}
      <nav className="glass-nav h-20 flex items-center border-b border-white/[0.05]">
        <div className="container-content w-full flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <Logo size="md" />
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={clsx(
                    'px-5 py-2.5 text-base font-medium rounded-lg transition-all duration-150',
                    pathname === to
                      ? 'text-white bg-white/[0.08]'
                      : 'text-body hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              /* Logged-in state */
              <div className="hidden md:flex items-center gap-3">
                <UserMenu user={user} onLogout={handleLogout} />
              </div>
            ) : (
              /* Logged-out state */
              <div className="hidden md:flex items-center gap-2">
                <Button to="/login" variant="ghost" size="md">Sign In</Button>
                <Button to="/signup" variant="primary" size="md">Get Started</Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
