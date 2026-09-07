/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out both',
      },
      colors: {
        primary: {
          50:  '#eef6f5',
          100: '#dceeed',
          200: '#b5d9d6',
          300: '#8ec4bf',
          400: '#5a9e9e',
          500: '#3d8888',
          600: '#357575',
          700: '#2d6363',
          800: '#234e4e',
          900: '#1a3a3a',
        },
        accent: {
          50:  '#faf1ec',
          100: '#f5e0d6',
          200: '#e8c4b0',
          300: '#dba88a',
          400: '#d08c6a',
          500: '#c96d4f',
          600: '#b8593a',
          700: '#9a4a2f',
          800: '#7c3b25',
          900: '#5e2d1b',
        },
        surface: {
          page:  '#f8f7f5',
          card:  '#ffffff',
          muted: '#f1efec',
          // The immersive pages (slideshow, auth, onboarding, map) sit deliberately deeper
          // than primary-900, which is the nav's colour. These were inline hex literals
          // scattered across five files; naming them keeps the look and drops the magic
          // numbers. `dark` is for panels and sections, `darkest` for full-bleed backgrounds.
          dark:    '#0f2a2a',
          darkest: '#0d2626',
        },
        border: {
          DEFAULT: '#d8d4cf',
          input:   '#c5c0b9',
        },
      },
    },
  },
  plugins: [],
}
