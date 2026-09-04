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
        // Monochrome Obsidian & Glass Palette
        mono: {
          darkest: '#000000',
          950: '#050507',
          900: '#0a0a0e',
          850: '#111116',
          800: '#1a1a22',
          700: '#2a2a35',
          600: '#40404e',
          400: '#8e8e9d',
          200: '#d1d1db',
          100: '#f4f4f7',
        },
        // Backward compatibility mapped to sleek liquid glass darks & crisp whites
        cyber: {
          darkest: '#000000',
          950: '#050507',
          900: '#0d0d12',
          850: '#14141c',
          800: '#1e1e28',
          700: '#2e2e3e',
        },
        neon: {
          cyan: '#ffffff', // Monochrome high-contrast pure white
          magenta: '#f4f4f5',
          yellow: '#e4e4e7',
          green: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glass-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
        'glass-pill': '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.16)',
        'glass-glow': '0 0 25px rgba(255, 255, 255, 0.15)',
        'glass-glow-sm': '0 0 12px rgba(255, 255, 255, 0.1)',
        'cyber-cyan': '0 0 20px -2px rgba(255, 255, 255, 0.3)',
        'cyber-magenta': '0 0 20px -2px rgba(255, 255, 255, 0.3)',
        'cyber-yellow': '0 0 20px -2px rgba(255, 255, 255, 0.3)',
        'cyber-green': '0 0 20px -2px rgba(255, 255, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
