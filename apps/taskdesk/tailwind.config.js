/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        sand: 'rgb(var(--color-sand) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        teal: 'rgb(var(--color-teal) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
