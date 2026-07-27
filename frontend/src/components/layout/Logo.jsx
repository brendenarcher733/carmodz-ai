/* Brand mark — a wireframe car-outline glyph (line-art body + motion-streak
   accents, no wheels, same spirit as classic automotive logo marks) paired
   with the "CarModz-AI" wordmark, matching the app's real domain naming
   (carmodz-ai.vercel.app) rather than the in-UI "CarMods AI" copy. Drawn
   fresh in the app's own accent orange rather than reusing any external
   logo file. The outline "draws itself in" once on mount (stroke-dashoffset
   animation) and the speed-streaks drift continuously to suggest motion —
   both respect prefers-reduced-motion via the .logo-mark rules in
   globals.css. Used by Navbar.jsx and AuthCard.jsx so there's one signature
   mark across the whole app instead of two independently-styled "C" tiles. */

const SIZES = {
  sm: { box: 28, font: 'text-sm' },
  md: { box: 36, font: 'text-lg' },
}

export function Logo({ size = 'md', className = '' }) {
  const { box, font } = SIZES[size] || SIZES.md

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={box} height={box} viewBox="0 0 44 32" fill="none"
        className="logo-mark flex-shrink-0"
        aria-hidden="true"
      >
        {/* Car body outline — roofline, hood, short tail, single stroke */}
        <path
          className="logo-mark-body"
          pathLength="1"
          d="M4 20c1-3 3-5 6-6l4-6c2-2 5-3 8-3 5 0 9 2 12 6l4 1c2 .6 3 2 3 4"
          stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Motion streaks */}
        <path className="logo-streak logo-streak-1" pathLength="1" d="M2 22h20" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
        <path className="logo-streak logo-streak-2" pathLength="1" d="M8 26h16" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" />
        <path className="logo-streak logo-streak-3" pathLength="1" d="M26 22h12" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className={`font-display font-bold text-white tracking-tight ${font}`}>
        CarModz<span className="text-accent">-AI</span>
      </span>
    </span>
  )
}
