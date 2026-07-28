import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Spinner } from './Spinner'

const BASE = [
  'inline-flex items-center justify-center gap-2',
  'font-display font-semibold tracking-tight',
  'transition-all duration-200 cursor-pointer select-none',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

const VARIANTS = {
  primary:   'bg-accent text-obsidian hover:bg-accent-bright hover:shadow-glow-sm active:scale-[0.98]',
  // Reserved for genuine AI-powered actions (e.g. the Advisor's Send
  // button) — mirrors `primary` 1:1 but on the `ai` cyan token, never used
  // for build/save/upgrade actions even when the underlying data is
  // AI-generated.
  ai:        'bg-ai text-obsidian hover:bg-ai-bright hover:shadow-glow-ai-sm active:scale-[0.98]',
  secondary: 'bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.1] hover:border-white/[0.2]',
  ghost:     'text-body hover:text-white hover:bg-white/[0.05]',
  // Bordered, no fill — a lighter-weight secondary action than `secondary`.
  outline:   'border border-white/[0.1] text-body hover:border-white/[0.22] hover:text-white',
  danger:    'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50',
  // Filled, borderless — icon-only chrome buttons (modal close, toggles)
  // that need a visible resting state but no outline.
  subtle:    'bg-white/[0.06] text-muted hover:text-white hover:bg-white/[0.1]',
}

const SIZES = {
  // min-h-11 (44px, Apple HIG minimum) only below `md` — sm buttons are
  // often compact/secondary actions, but on a touch screen they still need
  // a real tap target; desktop's tighter py-1.5 visual size is unaffected.
  sm: 'text-xs px-3.5 py-1.5 rounded-xl min-h-11 md:min-h-0',
  md: 'text-sm px-5 py-2.5 rounded-2xl',
  lg: 'text-sm px-6 py-3 rounded-2xl',
  xl: 'text-base px-8 py-3.5 rounded-2xl',
  // Square icon-only button (modal close buttons, toggle chevrons). Real
  // 44px tap target on mobile, the tighter 36px it's always been on desktop.
  // Kept at the smaller 12px radius (not the 16px standard) — at this small
  // a square size, 16px reads almost circular rather than "engineered".
  icon: 'w-11 h-11 md:w-9 md:h-9 md:min-h-0 md:min-w-0 rounded-xl p-0',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  fullWidth,
  type = 'button',
  onClick,
  to,
  ...rest
}) {
  const classes = clsx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
  const content = loading
    ? <Spinner size="sm" className="border-t-current border-current/25" />
    : children

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  )
}
