/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F14',
        surface: '#1A1F26',
        surface2: '#21272F',
        surface3: '#2A3038',
        blue: '#3FA9F5',
        blue2: '#1F6FE5',
        border: '#2A2F36',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}