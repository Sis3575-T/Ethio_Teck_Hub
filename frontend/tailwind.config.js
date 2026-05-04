/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ethiopian flag-inspired primary palette
        ethiopian: {
          green: '#078930',
          yellow: '#FCDD09',
          red: '#DA121A',
        },
        primary: {
          50: '#e6f4eb',
          100: '#c0e3cc',
          200: '#96d1aa',
          300: '#6bbf88',
          400: '#4ab16f',
          500: '#078930', // Ethiopian green
          600: '#067a2a',
          700: '#056823',
          800: '#04571c',
          900: '#033a12',
        },
        accent: {
          yellow: '#FCDD09',
          red: '#DA121A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    // eslint-disable-next-line no-undef
    require('@tailwindcss/forms'),
  ],
};
