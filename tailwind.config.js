/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg)',
        brand: {
          50: 'var(--teal-50)',
          100: 'var(--teal-100)',
          200: 'var(--teal-200)',
          300: 'var(--teal-300)',
          400: 'var(--teal-400)',
          500: 'var(--teal-500)',
          600: 'var(--teal-600)',
          700: 'var(--teal-700)',
          800: 'var(--teal-800)',
          900: 'var(--teal-900)',
        },
        amber: {
          50: 'var(--amber-50)',
          100: 'var(--amber-100)',
          200: 'var(--amber-200)',
          500: 'var(--amber-500)',
          600: 'var(--accent-hover)',
          700: 'var(--accent)',
        },
        // Reference palette (design-system.md §0b)
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          text: 'var(--accent-text)',
          soft: 'var(--accent-soft)',
        },
        highlight: 'var(--highlight)',
        progress: { DEFAULT: 'var(--progress)', text: 'var(--progress-text)', soft: 'var(--progress-soft)' },
        cat: {
          1: 'var(--cat-1)', 2: 'var(--cat-2)', 3: 'var(--cat-3)',
          4: 'var(--cat-4)', 5: 'var(--cat-5)', 6: 'var(--cat-6)',
        },
        ink: 'var(--ink)',
        mist: 'var(--mist)',
        canvas: 'var(--canvas)',
        // Off-brand Tailwind ramps are remapped to Quirri tokens so legacy
        // utility classes (slate/gray/red/emerald/green) render on-palette.
        slate: {
          50: 'var(--neutral-50)', 100: 'var(--neutral-100)', 200: 'var(--neutral-200)',
          300: 'var(--neutral-300)', 400: 'var(--neutral-400)', 500: 'var(--neutral-500)',
          600: 'var(--neutral-600)', 700: 'var(--neutral-600)', 800: 'var(--neutral-900)', 900: 'var(--neutral-900)',
        },
        gray: {
          50: 'var(--neutral-50)', 100: 'var(--neutral-100)', 200: 'var(--neutral-200)',
          300: 'var(--neutral-300)', 400: 'var(--neutral-400)', 500: 'var(--neutral-500)',
          600: 'var(--neutral-600)', 700: 'var(--neutral-600)', 800: 'var(--neutral-900)', 900: 'var(--neutral-900)',
        },
        red: {
          50: 'var(--error-soft)', 100: 'var(--error-soft)', 200: 'var(--error-line)',
          400: 'var(--color-error)', 500: 'var(--color-error)', 600: 'var(--color-error)', 700: 'var(--color-error)',
        },
        emerald: { 50: 'var(--success-soft)', 500: 'var(--color-success)', 600: 'var(--color-success)', 700: 'var(--color-success)' },
        green: { 50: 'var(--success-soft)', 500: 'var(--color-success)', 600: 'var(--color-success)', 700: 'var(--color-success)' },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        // Poppins via --font (Brand Guidelines v1.0)
        sans: ['var(--font)', 'system-ui', 'sans-serif'],
        auth: ['var(--font-auth)', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      // Owner override (Quirri Prep): 6 controls · 8 cards · 16 modals/drawers
      borderRadius: {
        quirri: '8px',
        'quirri-card': '8px',
        'quirri-sm': '6px',
        'quirri-control': '6px',
        'quirri-lg': '16px',
        'quirri-panel': '16px',
      },
      boxShadow: {
        quirri: '0 1px 2px rgba(16, 34, 40, 0.06)',
        'quirri-card': '0 1px 2px rgba(16, 34, 40, 0.06), 0 4px 12px rgba(16, 34, 40, 0.08)',
        'quirri-md': '0 4px 12px rgba(16, 34, 40, 0.08)',
        'quirri-lg': '0 12px 32px rgba(16, 34, 40, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
};
