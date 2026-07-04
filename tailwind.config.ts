import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd4ff",
          300: "#8fb8ff",
          500: "#3b7cff",
          600: "#1d5fe8",
          700: "#164bc0",
          800: "#153f9e",
          900: "#17377d",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f4f7fb",
          elevated: "#ffffff",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
        "card-hover":
          "0 2px 4px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.08)",
        glow: "0 0 0 1px rgba(29, 95, 232, 0.08), 0 12px 32px rgba(29, 95, 232, 0.12)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)",
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(29, 95, 232, 0.12), transparent 42%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.08), transparent 38%)",
      },
      backgroundSize: {
        grid: "24px 24px",
      },
    },
  },
  plugins: [],
};
export default config;
