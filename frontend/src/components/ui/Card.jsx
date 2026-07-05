import clsx from 'clsx'

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
  xl:   'p-8',
}

export function Card({ children, className, padding = 'md', hover = false, glow = false }) {
  return (
    <div className={clsx(
      'bg-surface border border-white/[0.07] rounded-2xl',
      PADDING[padding],
      hover && 'transition-all duration-200 cursor-pointer hover:border-white/[0.14] hover:bg-elevated hover:shadow-card',
      glow && 'shadow-card border-white/[0.12]',
      className,
    )}>
      {children}
    </div>
  )
}
