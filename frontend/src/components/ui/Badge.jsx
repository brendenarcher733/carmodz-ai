import clsx from 'clsx'
import s from './Badge.module.css'

export function Badge({ children, variant = 'default', size = 'md' }) {
  return <span className={clsx(s.badge, s[variant], s[size])}>{children}</span>
}
