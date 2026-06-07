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
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(255,140,0,0.15)',
        'glow':    '0 0 24px rgba(255,140,0,0.2)',
        'glow-lg': '0 0 60px rgba(255,140,0,0.12)',
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
