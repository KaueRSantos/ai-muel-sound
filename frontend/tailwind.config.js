/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'studio-dark': '#0a0a1a',
        'studio-purple': '#8b5cf6',
        'studio-blue': '#3b82f6',
        'studio-pink': '#ec4899',
      },
      backgroundImage: {
        'studio-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },
  plugins: [],
}

