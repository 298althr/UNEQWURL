import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces (CSS-variable mapped)
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-hover": "var(--border-hover)",
        // Brand category colors
        orange: "hsl(27, 93%, 60%)",
        blue: "#00a6ff",
        red: "#ff0056",
        purple: "#6500ff",
        gold: "#ffb700",
        // Legacy aliases
        accent: "var(--accent)",
        "accent-light": "var(--accent-light)",
        "accent-dark": "var(--accent-dark)",
      },
      borderRadius: {
        "r-sm": "6px",
        "r-md": "8px",
        "r-xl": "12px",
        "r-full": "9999px",
      },
      transitionTimingFunction: {
        "spring-custom": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      fontFamily: {
        sans: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        geist: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["Geist", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "monospace"],
      },
      maxWidth: {
        mobile: "430px",
        container: "1100px",
      },
    },
  },
  plugins: [],
};

export default config;
