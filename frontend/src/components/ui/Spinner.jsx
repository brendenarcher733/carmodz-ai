import clsx from 'clsx'

const SIZES = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-2',
}

export function Spinner({ size = 'md', className }) {
  return (
    <div
      aria-label="Loading"
      className={clsx(
        'rounded-full border-white/20 border-t-accent animate-spin',
        SIZES[size],
        className,
      )}
    />
  )
}
