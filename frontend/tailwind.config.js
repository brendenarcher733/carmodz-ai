/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Premium-automotive palette: near-black matte + graphite, rather
        // than the previous slightly-blue-tinted dark-SaaS grays.
        obsidian:  '#090909',
        charcoal:  '#0A0A0A',
        surface:   '#141414',
        elevated:  '#1C1C1C',
        overlay:   '#242424',
        // Recessed-panel background — one shade darker than `surface`, for
        // content that sits *inside* a surface (e.g. the configurator's
        // side panels). Was previously re-typed as raw hex in two files.
        panel:     '#0C0C0C',
        // Overrides Tailwind's built-in `white` — every existing
        // `text-white` / `border-white/[0.0X]` hairline across the app
        // picks up this crisp off-white automatically; pure #FFFFFF reads
        // slightly harsher against the new matte-black background.
        white: '#F5F5F5',
        // Electric Orange — performance/build actions (Build, Save,
        // Upgrade, Garage). The app's primary accent.
        accent: {
          DEFAULT: '#FF6B00',
          bright:  '#FF8833',
          dim:     'rgba(255,107,0,0.12)',
        },
        // Electric Cyan — reserved EXCLUSIVELY for AI-generated content and
        // AI-powered actions (Ask AI, Recommendations, Smart Analysis), so
        // it stays meaningful signal rather than a second decorative color.
        // Never use `ai` for a build/commerce/navigation element even when
        // the underlying data originated from the AI (see globals.css and
        // the per-page usage this backs).
        ai: {
          DEFAULT: '#00C8FF',
          bright:  '#33D3FF',
          dim:     'rgba(0,200,255,0.12)',
        },
        stage: {
          1: '#22C55E',
          2: '#F59E0B',
          3: '#EF4444',
        },
        // Favorite/star accent — distinct from `accent` (orange) on purpose,
        // matching the universal "starred" convention.
        gold: '#FFC800',
        body:  '#9BA3AF',
        muted: '#4A4F5C',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      // Bump the entire type scale up — everything reads larger
      fontSize: {
        xs:   ['13px', { lineHeight: '1.5'  }],
        sm:   ['15px', { lineHeight: '1.6'  }],
        base: ['17px', { lineHeight: '1.65' }],
        lg:   ['19px', { lineHeight: '1.55' }],
        xl:   ['21px', { lineHeight: '1.4'  }],
        '2xl':['25px', { lineHeight: '1.3'  }],
        '3xl':['31px', { lineHeight: '1.25' }],
        '4xl':['38px', { lineHeight: '1.15' }],
        '5xl':['48px', { lineHeight: '1.1'  }],
        '6xl':['60px', { lineHeight: '1.05' }],
        '7xl':['72px', { lineHeight: '1'    }],
      },
      spacing: {
        // Slightly more generous base unit — bigger hit targets
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        // Soft, restrained lift with a whisper of warmth — never a glowing ring.
        // Reserved for primary CTAs only.
        'glow-sm': '0 6px 20px rgba(255,107,0,0.10)',
        'glow':    '0 10px 32px rgba(255,107,0,0.14)',
        'glow-lg': '0 16px 56px rgba(255,107,0,0.10)',
        // Same restrained recipe as glow-sm/glow, keyed to the `ai` cyan —
        // for the small set of genuine AI-action buttons only.
        'glow-ai-sm': '0 6px 20px rgba(0,200,255,0.12)',
        'glow-ai':    '0 10px 32px rgba(0,200,255,0.16)',
        'card':    '0 4px 24px rgba(0,0,0,0.5)',
        'card-lg': '0 8px 56px rgba(0,0,0,0.7)',
        // Floating panels above other content (dropdowns, popovers) —
        // tighter and darker than the card shadows above, which are for
        // content sitting flat in the page.
        'dropdown': '0 16px 48px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-up':   'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':   'fadeIn 0.4s ease both',
        'pulse-dot': 'pulseDot 2s infinite',
        'shimmer':   'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float':     'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.25' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
