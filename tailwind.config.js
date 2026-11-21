/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cosmic: {
          bg: "#080813",
          surface: "#13122b",
          card: "rgba(28, 25, 52, 0.72)",
          border: "rgba(255, 255, 255, 0.18)",
          purple: "#7c3aed",
          pink: "#ec4899",
          gold: "#f59e0b",
        },
        chat: {
          canvas: "#0b141a",
          header: "#111b21",
          green: "#00a884",
          outgoing: "#005c4b",
          incoming: "#1f2c34",
          border: "#222e35",
        },
      },
    },
  },
  plugins: [],
};
