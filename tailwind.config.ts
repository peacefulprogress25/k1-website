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
        brand: {
          orange: "#fe5500",
        },
        vault: {
          primary: "#0ea5e9",
          dark: "#0c4a6e",
          muted: "#64748b",
          border: "#334155",
          card: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
