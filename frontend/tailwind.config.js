/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian:  '#08090B',
        charcoal:  '#0D0E13',
        surface:   '#131519',
        elevated:  '#191C24',
        overlay:   '#1E2230',
        accent: {
          DEFAULT: '#FF8C00',
          bright:  '#FFB347',
          dim:     'rgba(255,140,0,0.12)',
        },
        stage: {
          1: '#22C55E',
          2: '#F59E0B',
          3: '#EF4444',
        },
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
        'glow-sm': '0 6px 20px rgba(255,140,0,0.10)',
        'glow':    '0 10px 32px rgba(255,140,0,0.14)',
        'glow-lg': '0 16px 56px rgba(255,140,0,0.10)',
        'card':    '0 4px 24px rgba(0,0,0,0.5)',
        'card-lg': '0 8px 56px rgba(0,0,0,0.7)',
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
