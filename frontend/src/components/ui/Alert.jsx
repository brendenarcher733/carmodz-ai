import clsx from 'clsx'

const VARIANTS = {
  error:   'bg-red-500/10 border-red-500/25 text-red-400',
  success: 'bg-stage-1/10 border-stage-1/25 text-stage-1',
  warning: 'bg-stage-2/10 border-stage-2/25 text-stage-2',
  info:    'bg-accent/10 border-accent/25 text-accent',
}

const ICONS = {
  error: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.25" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 4.5v3.5M7.5 10.25h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  success: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.25" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.75 7.6l1.9 1.9 3.3-3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5l6.5 11.5H1L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M7.5 6v3M7.5 11.25h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.25" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 6.75v3.5M7.5 4.75h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
}

/**
 * The one error/success/warning/info box in the app. Replaces five
 * independently-drifted inline recipes (different bg/border opacities,
 * different radii, some with no icon at all) that all meant the same thing.
 */
export function Alert({ variant = 'error', children, icon = true, className }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{ICONS[variant]}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
