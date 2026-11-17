/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-tema="oscuro"], [data-tema="morado"], .dark'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-heading)', 'Playfair Display', 'Georgia', 'serif'],
        heading: ['var(--font-heading)', 'Playfair Display', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

