/* Automotive icon set — replaces generic UI glyphs (grids, rects, gears) on
   the app's priority surfaces (nav chrome, garage, build detail) with icons
   that read as automotive at a glance. Same hand-rolled convention as every
   other icon in this app (currentColor stroke, no fill, 1.25-1.75 stroke
   width, small viewBox) so these drop in without a visual seam — there's no
   icon-library dependency anywhere in this codebase and this doesn't add one.
   All viewBoxes are 0 0 16 16; width/height/className pass through so call
   sites size them exactly like the inline SVGs they replace. */

const base = { viewBox: '0 0 16 16', fill: 'none', width: 16, height: 16 }

export function IconWrench({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path
        d="M10.6 2.3a3 3 0 00-3.9 3.9L2 11l1.4 1.4 4.8-4.7a3 3 0 003.9-3.9L10.4 5.5 9 4.1l1.6-1.8z"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconGarageBay({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M1.5 7L8 2l6.5 5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 6.5V14h11V6.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14V9.5h6V14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconGauge({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M2 10.5a6 6 0 1112 0" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8 10.5L11 6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="8" cy="10.5" r="0.9" fill="currentColor" />
      <path d="M2 10.5h1.2M12.8 10.5H14M4.3 5.8l.9.9M11.7 5.8l-.9.9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconTire({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M8 2v1.6M8 12.4V14M2 8h1.6M12.4 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconTurbo({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth={strokeWidth} />
      <path
        d="M8 8L5.6 4.9c1.3-.7 3.1-.6 4.2.6M8 8l3.1-2.4c.7 1.3.6 3.1-.6 4.2M8 8l2.4 3.1c-1.3.7-3.1.6-4.2-.6M8 8L4.9 10.4c-.7-1.3-.6-3.1.6-4.2"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconExhaust({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M1.5 6h6.5a2 2 0 012 2v0a2 2 0 002 2H14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="13" cy="10" rx="1.5" ry="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M2 8.5c1-1 1-2 0-3" stroke="currentColor" strokeWidth={strokeWidth * 0.8} strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function IconFuelPump({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <rect x="2.5" y="2.5" width="6" height="11" rx="1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M4.5 5.5h2M4.5 8h2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8.5 5.5H10a1.5 1.5 0 011.5 1.5v4.5a1 1 0 002 0V7.2a1 1 0 00-.3-.7l-1.4-1.4"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCheckeredFlag({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M3 1.5v13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M3 2.2c1.8-1 3.6-1 5.4 0s3.6 1 5.4 0v5.4c-1.8 1-3.6 1-5.4 0s-3.6-1-5.4 0z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M5.2 2.6v1.9M9.7 2.4v1.9M5.2 6.4v1.9M9.7 6.2v1.9" stroke="currentColor" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
    </svg>
  )
}

export function IconSparkPlug({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M6.5 1.5h3v3.5h-3z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M6 5h4v3a2 2 0 01-2 2 2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M8 10v2.5M6.5 14.5h3M8 12.5l-1 2M8 12.5l1 2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBrakeDisc({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="8" cy="8" r="1.6" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="8" cy="3.6" r="0.6" fill="currentColor" />
      <circle cx="11.8" cy="9.8" r="0.6" fill="currentColor" />
      <circle cx="4.2" cy="9.8" r="0.6" fill="currentColor" />
      <path d="M2.3 6.2A6 6 0 002.3 9.8" stroke="currentColor" strokeWidth={strokeWidth * 1.6} strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function IconToolbox({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <rect x="1.5" y="6" width="13" height="7.5" rx="1.2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M5.5 6V4a1 1 0 011-1h3a1 1 0 011 1v2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 9.5h13M7 9.5v1.6M9 9.5v1.6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconOilDrop({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <path d="M8 1.8c2 2.6 4 5.3 4 7.6a4 4 0 11-8 0c0-2.3 2-5 4-7.6z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M6.6 10.6a1.6 1.6 0 001.6 1.6" stroke="currentColor" strokeWidth={strokeWidth * 0.85} strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function IconCompassGauge({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M10.3 5.7l-1.4 3-3 1.4 1.4-3z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="8" cy="8" r="0.7" fill="currentColor" />
    </svg>
  )
}

export function IconKeyFob({ className, width = 16, height = 16, strokeWidth = 1.4 }) {
  return (
    <svg {...base} width={width} height={height} className={className}>
      <rect x="4.5" y="2" width="7" height="12" rx="3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <circle cx="8" cy="5.6" r="1.2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M6.3 9.2h3.4M6.3 11h3.4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}
