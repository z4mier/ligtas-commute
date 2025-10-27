/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgdark: "#111827",
        brand: "#0d658b",
        input: "#FFFFFF",
        border: "#D9DFE6",
        sub: "rgba(255,255,255,0.85)",
        link: "#70B6F8",
      },
    },
  },
  plugins: [],
};
