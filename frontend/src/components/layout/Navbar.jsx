import { Link, useLocation } from 'react-router-dom'
import s from './Navbar.module.css'
import clsx from 'clsx'

const NAV_LINKS = [
  { to: '/',        label: 'Home'     },
  { to: '/planner', label: 'Build Planner' },
  { to: '/builds',  label: 'My Builds' },
  { to: '/advisor', label: 'Mod Advisor' },
]

export function Navbar() {
  const { pathname } = useLocation()
  return (
    <header className={s.header}>
      <nav className={s.nav}>
        <Link to="/" className={s.logo}>
          <div className={s.logoMark}>⚙</div>
          <span className={s.logoText}>CarMods<span className={s.logoAccent}>AI</span></span>
        </Link>
        <ul className={s.links}>
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className={clsx(s.link, pathname === to && s.active)}>{label}</Link>
            </li>
          ))}
        </ul>
        <Link to="/planner" className={s.cta}>Start Build →</Link>
      </nav>
    </header>
  )
}
