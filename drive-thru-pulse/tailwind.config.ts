import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0d0d0f",
        surface: "#16161a",
        "surface-elevated": "#1e1e24",
        cfa: {
          red: "#E51636",
          "red-dark": "#b8112b",
          "red-glow": "#ff2d4d",
        },
        pace: {
          green: "#22c55e",
          yellow: "#eab308",
          red: "#ef4444",
        },
      },
      animation: {
        "tap-flash": "tap-flash 150ms ease-out",
        "tap-scale": "tap-scale 150ms ease-out",
      },
      keyframes: {
        "tap-flash": {
          "0%": { backgroundColor: "#ff2d4d" },
          "100%": { backgroundColor: "#E51636" },
        },
        "tap-scale": {
          "0%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
