/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./photostudio-react-tailwind/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        clients: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        'memories-display': ['"Cormorant Garamond"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        'memories-body': ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      boxShadow: {
        'clients-card':
          '0 8px 30px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -4px rgba(15, 23, 42, 0.04)',
        'clients-card-hover':
          '0 28px 56px -16px rgba(37, 99, 235, 0.18), 0 12px 28px -12px rgba(15, 23, 42, 0.12)',
        'clients-shell':
          '0 32px 64px -20px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
        'clients-cta':
          '0 8px 24px -4px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(255,255,255,0.2) inset',
        'clients-cta-hover':
          '0 14px 36px -6px rgba(29, 78, 216, 0.45), 0 0 0 1px rgba(255,255,255,0.25) inset',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
