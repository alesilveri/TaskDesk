/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0F14',
        sand: '#F7F4EF',
        surface: '#FFFFFF',
        teal: '#2BB3A3',
        amber: '#F59E0B',
        danger: '#E3514D',
      },
    },
  },
  plugins: [],
};
