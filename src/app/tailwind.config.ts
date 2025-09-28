import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'mgc-green': '#0B6B3A',
        'mgc-green-2': '#0F7A44',
        'hcu-blue': '#0033A0',
        'hcu-orange': '#F15A22',
      },
    },
  },
  plugins: [],
} satisfies Config
