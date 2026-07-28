import clsx from 'clsx'

const SIZES = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-2',
}

// `variant="ai"` for genuine AI-generation loading states (the Advisor's
// typing indicator, "analyzing your build" waits) — everything else
// (build-saving, page loads) stays the default accent orange.
const VARIANTS = {
  accent: 'border-t-accent',
  ai:     'border-t-ai',
}

export function Spinner({ size = 'md', variant = 'accent', className }) {
  return (
    <div
      aria-label="Loading"
      className={clsx(
        'rounded-full border-white/20 animate-spin',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  )
}
