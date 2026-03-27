/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6366f1', // Indigo 500
          secondary: '#4f46e5', // Indigo 600
          bg: '#f8fafc', // Slate 50
          surface: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
}
