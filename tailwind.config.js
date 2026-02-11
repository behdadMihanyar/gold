/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // همه فایل‌های JSX/TSX
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6", // آبی Tailwind
        secondary: "#8b5cf6", // بنفش
        accent: "#f43f5e", // قرمز/خروج و هشدار
        bgLight: "#f0f4f8", // بک‌گراند روشن
      },
      fontFamily: {
        vazir: ["Vazirmatn", "sans-serif"], // فونت فارسی
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true, // فعال بودن reset CSS
  },
  darkMode: "media", // پشتیبانی از حالت تاریک اختیاری
};
