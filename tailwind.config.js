/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Watches all JS/JSX/TS/TSX files in src
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"], // Optional: Add a custom font
      },
    },
  },
  plugins: [],
};
