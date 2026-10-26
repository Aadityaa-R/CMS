/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'card': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'modal': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        'card': '0.5rem',
      },
      fontSize: {
        '2xs': '0.625rem',
        'xs-plus': '0.6875rem',
        'fs-kpi': 'var(--fs-kpi)',
        'fs-kpi-label': 'var(--fs-kpi-label)',
        'fs-title': 'var(--fs-title)',
        'fs-body': 'var(--fs-body)',
        'fs-label': 'var(--fs-label)',
        'fs-th': 'var(--fs-th)',
        'fs-axis': 'var(--fs-axis)',
      },
      colors: {
        clinic: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
};
