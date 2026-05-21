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
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          glow: 'rgba(59, 130, 246, 0.1)',
        },
        secondary: {
          DEFAULT: '#0ea5e9',
          glow: 'rgba(14, 165, 233, 0.1)',
        },
        accent: {
          DEFAULT: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '14px',
        md: '10px',
        sm: '6px',
      }
    },
  },
  plugins: [],
}
