import clsx from 'clsx'
import s from './Button.module.css'
import { Spinner } from './Spinner'

export function Button({
  children, variant='primary', size='md', loading=false,
  disabled=false, fullWidth=false, onClick, type='button', className, ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(s.btn, s[variant], s[size], fullWidth && s.full, className)}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
