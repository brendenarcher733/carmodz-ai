import clsx from 'clsx'

const BASE = [
  'inline-flex items-center justify-center gap-2',
  'font-display font-semibold tracking-tight',
  'transition-all duration-150 cursor-pointer select-none',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ')

const VARIANTS = {
  primary:   'bg-accent text-obsidian hover:bg-accent-bright hover:shadow-glow active:scale-[0.98]',
  secondary: 'bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.1] hover:border-white/[0.2]',
  ghost:     'text-body hover:text-white hover:bg-white/[0.05]',
  danger:    'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50',
}

const SIZES = {
  sm: 'text-xs px-3.5 py-1.5 rounded-lg',
  md: 'text-sm px-5 py-2.5 rounded-xl',
  lg: 'text-sm px-6 py-3 rounded-xl',
  xl: 'text-base px-8 py-3.5 rounded-xl',
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
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading
        ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : children}
    </button>
  )
}
