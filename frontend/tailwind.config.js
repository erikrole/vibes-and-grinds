/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fbf7ef',
          100: '#f6efdf',
          200: '#ece1c6',
          300: '#dcc99e',
        },
        espresso: {
          50: '#f4ede2',
          100: '#e0cfb4',
          200: '#9d7a4f',
          500: '#5a3a1f',
          700: '#3a2412',
          800: '#241509',
          900: '#160c05',
        },
        copper: {
          400: '#d18a4d',
          500: '#b8743f',
          600: '#9a5a2c',
          700: '#7c4621',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Fraunces', 'Georgia', 'serif'],
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke',
      }
    },
  },
  plugins: [],
}
