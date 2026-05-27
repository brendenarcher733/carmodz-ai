import clsx from 'clsx'
import s from './Card.module.css'

export function Card({ children, className, glow, hover, padding = 'md' }) {
  return (
    <div className={clsx(s.card, s[padding], glow && s.glow, hover && s.hover, className)}>
      {children}
    </div>
  )
}
