import clsx from 'clsx'

const VARIANTS = {
  default:  'bg-white/[0.06] text-body',
  success:  'bg-green-500/10 text-green-400 border border-green-500/20',
  warning:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger:   'bg-red-500/10  text-red-400  border border-red-500/20',
  easy:     'bg-green-500/10 text-green-400 border border-green-500/20',
  medium:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  hard:     'bg-red-500/10  text-red-400  border border-red-500/20',
  stage1:   'bg-green-500/10 text-green-400 border border-green-500/20',
  stage2:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  stage3:   'bg-red-500/10  text-red-400  border border-red-500/20',
  accent:   'bg-accent/10 text-accent border border-accent/25',
}

const SIZES = {
  sm: 'text-xs px-2 py-0.5 rounded-md',
  md: 'text-xs    px-2.5 py-1  rounded-lg',
}

export function Badge({ children, variant = 'default', size = 'md', className }) {
  return (
    <span className={clsx(
      'inline-flex items-center font-mono font-medium',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}>
      {children}
    </span>
  )
}
