import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        gray: {
          200: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
} satisfies Config