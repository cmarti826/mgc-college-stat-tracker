// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        mgc: {
          red: '#B22234',   // American red
          white: '#FFFFFF',
          blue: '#3C3B6E',  // Navy flag blue
          accent: '#E1E1E1', // light gray for contrast
        },
      },
    },
  },
  plugins: [],
}

export default config
