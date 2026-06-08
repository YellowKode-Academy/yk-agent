/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#ffd600',
        'brand-fg': '#0a0a0a',
        surface: '#121212',
        panel: '#1a1a1a',
        fg: '#f5f5f5',
        muted: '#9d9d9d',
        bdr: '#2a2a2a',
        accent: '#232323',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
