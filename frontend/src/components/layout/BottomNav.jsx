import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileSheet } from './ProfileSheet'
import { IconWrench, IconGarageBay, IconCompassGauge } from '../icons/AutoIcons'
import clsx from 'clsx'

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 10.5L11 4l7 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 9v8a1 1 0 001 1h3v-5h2v5h3a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  planner: <IconWrench width={22} height={22} strokeWidth={1.5} />,
  garage:  <IconGarageBay width={22} height={22} strokeWidth={1.5} />,
  advisor: <IconCompassGauge width={22} height={22} strokeWidth={1.5} />,
  signIn: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M9 4H5a1 1 0 00-1 1v12a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 15l4-4-4-4M18 11H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

function TabLink({ to, label, icon, active }) {
  return (
    <Link
      to={to}
      className="tap-target flex-1 flex flex-col items-center justify-center gap-0.5"
    >
      <span className={active ? 'text-accent' : 'text-muted'}>{icon}</span>
      <span className={clsx('text-[10px] font-medium', active ? 'text-accent' : 'text-muted')}>
        {label}
      </span>
    </Link>
  )
}

function ProfileTab({ user, active, onOpen }) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={onOpen}
      className="tap-target flex-1 flex flex-col items-center justify-center gap-0.5"
    >
      <span
        className={clsx(
          'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-display font-bold',
          active ? 'bg-accent/[0.18] border border-accent/40 text-accent' : 'bg-white/[0.06] border border-white/[0.12] text-muted',
        )}
      >
        {initials}
      </span>
      <span className={clsx('text-[10px] font-medium', active ? 'text-accent' : 'text-muted')}>
        Profile
      </span>
    </button>
  )
}

/* Mobile-only bottom tab bar — the primary navigation surface on mobile,
   replacing the old hamburger menu entirely (see Navbar.jsx). Doesn't
   render at all at md: and above. */
export function BottomNav() {
  const { pathname }     = useLocation()
  const navigate         = useNavigate()
  const { user, logout } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleLogout = async () => {
    setSheetOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <>
      <nav
        className="glass-nav md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch border-t border-white/[0.07]"
        style={{ height: '4rem', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <TabLink to="/" label="Home" icon={ICONS.home} active={pathname === '/'} />

        {user ? (
          <>
            <TabLink to="/planner" label="Planner" icon={ICONS.planner} active={pathname.startsWith('/planner')} />
            <TabLink to="/builds"  label="Garage"  icon={ICONS.garage}  active={pathname.startsWith('/builds')} />
            <TabLink to="/advisor" label="Advisor" icon={ICONS.advisor} active={pathname.startsWith('/advisor')} />
            <ProfileTab user={user} active={sheetOpen} onOpen={() => setSheetOpen(true)} />
          </>
        ) : (
          <>
            <TabLink to="/advisor" label="Advisor" icon={ICONS.advisor} active={pathname.startsWith('/advisor')} />
            <TabLink to="/login"   label="Sign In"  icon={ICONS.signIn} active={pathname === '/login'} />
          </>
        )}
      </nav>

      {user && (
        <ProfileSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
