/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background tokens
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        // Text tokens
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        // Border
        border: 'var(--border)',
        // Accent
        'accent-primary': 'var(--accent-primary)',
        'accent-glow': 'var(--accent-glow)',
        // Profile D - Dominante / Dominant
        'profile-D': {
          DEFAULT: 'var(--color-D)',
          light: 'var(--color-D-light)',
        },
        // Profile I - Influente / Influential
        'profile-I': {
          DEFAULT: 'var(--color-I)',
          light: 'var(--color-I-light)',
        },
        // Profile S - Estável / Stable
        'profile-S': {
          DEFAULT: 'var(--color-S)',
          light: 'var(--color-S-light)',
        },
        // Profile C - Analítico / Analytical
        'profile-C': {
          DEFAULT: 'var(--color-C)',
          light: 'var(--color-C-light)',
        },
        // Direct color values for use without CSS vars
        indigo: {
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px var(--accent-glow)',
        'glow-sm': '0 0 10px var(--accent-glow)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-glow': 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px var(--accent-glow)' },
          '50%': { boxShadow: '0 0 25px var(--accent-glow)' },
        },
      },
      screens: {
        xs: '375px',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      zIndex: {
        60: '60',
        70: '70',
        80: '80',
        90: '90',
        100: '100',
      },
    },
  },
  plugins: [],
};
