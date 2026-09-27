/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          background: "#FAF7F2",
          surface: "#FFFFFF",
          primary: "#A7C4BC",
          secondary: "#E8C4C4",
          tertiary: "#C9D6EA",
          warning: "#F2D9B1",
          error: "#E3B7B0",
          success: "#B7CDB0",
          textPrimary: "#2E2A26",
          textSecondary: "#6B6560",
          border: "#E5DFD6",
        }
      },
      fontFamily: {
        serif: ['Lora', 'Source Serif 4', 'serif'],
        sans: ['Inter', 'IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
