/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          darkest: '#060709',
          950: '#0a0a0c',
          900: '#0f1117',
          850: '#141824',
          800: '#1b2133',
          700: '#2c354f',
        },
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff0055',
          yellow: '#ffe600',
          green: '#00ff66',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyber-cyan': '0 0 20px -2px rgba(0, 240, 255, 0.45)',
        'cyber-magenta': '0 0 20px -2px rgba(255, 0, 85, 0.45)',
        'cyber-yellow': '0 0 20px -2px rgba(255, 230, 0, 0.45)',
        'cyber-green': '0 0 20px -2px rgba(0, 255, 102, 0.45)',
      }
    },
  },
  plugins: [],
}
