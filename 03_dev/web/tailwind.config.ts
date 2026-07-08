import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fixed accents (same in light + dark)
        navy: "#0F172A",
        blue: "#2563EB",
        green: "#16A34A",
        orange: "#EA580C",
        red: "#DC2626",
        // Theme-aware tokens (flip via CSS vars in .dark). RGB-triplet form so
        // Tailwind opacity modifiers like text-ink/60 keep working.
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        slate: "rgb(var(--slate-rgb) / <alpha-value>)",
        gray: "rgb(var(--gray-rgb) / <alpha-value>)",
        line: "rgb(var(--line-rgb) / <alpha-value>)",
        // High-contrast accent (dark chips/buttons in light; inverts to light in dark).
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        accentfg: "rgb(var(--accent-fg-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Pretendard",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Pretendard", "system-ui", "monospace"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(15, 23, 42, 0.06)",
        sharp: "8px 8px 0px 0px rgb(var(--shadow-rgb))",
        "sharp-sm": "4px 4px 0px 0px rgb(var(--shadow-rgb))",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      animation: {
        marquee: "marquee 20s linear infinite",
        pulse: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
