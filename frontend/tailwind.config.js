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
        canvas: 'var(--canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          muted: 'var(--surface-muted)',
        },
        field: 'var(--field)',
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        paper: {
          DEFAULT: 'var(--paper)',
          2: 'var(--paper-2)',
          tint: 'var(--paper-tint)',
        },
        rule: 'var(--rule)',
        latte: {
          DEFAULT: 'var(--latte)',
          deep: 'var(--latte-deep)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
        },
        focus: 'var(--focus)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        score: {
          low: 'var(--score-low)',
          'low-mid': 'var(--score-low-mid)',
          mid: 'var(--score-mid)',
          good: 'var(--score-good)',
          high: 'var(--score-high)',
          peak: 'var(--score-peak)',
          up: 'var(--score-up)',
          down: 'var(--score-down)',
        },
        vt: {
          bg: 'var(--vt-bg)',
          surface: 'var(--vt-surface)',
          'surface-2': 'var(--vt-surface-2)',
          rule: 'var(--vt-rule)',
          'rule-strong': 'var(--vt-rule-strong)',
          ink: 'var(--vt-ink)',
          'ink-dim': 'var(--vt-ink-dim)',
          'ink-mute': 'var(--vt-ink-mute)',
          'ink-faint': 'var(--vt-ink-faint)',
          red: 'var(--vt-red)',
          'red-hot': 'var(--vt-red-hot)',
        },
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
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke',
      }
    },
  },
  plugins: [],
}
