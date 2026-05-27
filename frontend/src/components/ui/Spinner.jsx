import s from './Spinner.module.css'
import clsx from 'clsx'

export function Spinner({ size = 'md', className }) {
  return <div className={clsx(s.spinner, s[size], className)} aria-label="Loading" />
}
