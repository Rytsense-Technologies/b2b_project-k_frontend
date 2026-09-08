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
          600: 'var(--amber-600)',
          700: 'var(--amber-700)',
        },
        ink: 'var(--ink)',
        mist: 'var(--bg)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        // Resolves via CSS vars: Plus Jakarta on portals; Poppins inside .auth (--font remapped)
        sans: ['var(--font)', 'system-ui', 'sans-serif'],
        auth: ['var(--font-auth)', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        quirri: '12px',
        'quirri-sm': '2px',
        'quirri-lg': '18px',
      },
      boxShadow: {
        quirri: '0 1px 2px rgba(16, 34, 40, 0.06)',
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
