/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // All JSX/TSX files in src folder
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // Tailwind Blue
        secondary: "#8b5cf6", // Purple
        accent: "#f43f5e", // Red for alerts or actions
        bgLight: "#f0f4f8", // Light background color
      },
      fontFamily: {
        vazir: ["vazir", "sans-serif"], // Persian font
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true, // Ensures reset CSS is applied
  },
  darkMode: "media", // Dark mode based on system preference
};
