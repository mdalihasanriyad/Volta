/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#38BDF8', deep: '#0284C7', soft: '#E0F2FE' },
        ink: '#111827',
      },
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(17,24,39,.05), 0 4px 16px -6px rgba(17,24,39,.10)' },
    },
  },
  plugins: [],
}
