/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // Angular'ın HTML ve TS dosyalarını tara demek
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["corporate"], // Vakıfbank stajına yakışır ağırbaşlı tema
  },
}