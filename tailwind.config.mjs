/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        teer: {
          dark: '#0f172a',
          card: '#1e293b',
          accent: '#f59e0b',
          green: '#10b981',
          blue: '#3b82f6',
          red: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
