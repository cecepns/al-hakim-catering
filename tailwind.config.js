/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5e6f7',
          100: '#e6c2eb',
          200: '#d69ede',
          300: '#c67ad1',
          400: '#9d3cab',
          500: '#7a1d88',
          600: '#62046d',
          700: '#51035a',
          800: '#400248',
          900: '#2f0236',
          950: '#1e0124',
        },
      },
    },
  },
  plugins: [],
}

