/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Trinidad red-white-black brand palette.
        brand: {
          red: "#E10600",
          "red-dim": "#B30500",
          black: "#0A0A0A",
          white: "#FFFFFF",
        },
        // Surface tokens (drive both light + dark via CSS vars in index.css).
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        feedback: {
          exact: "var(--feedback-exact)",
          wrong: "var(--feedback-wrong)",
          ordered: "var(--feedback-ordered)",
        },
      },
      fontFamily: {
        display: ["Anton", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(225, 6, 0, 0.35)",
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateX(0deg)" },
          "50%": { transform: "rotateX(90deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
      },
      animation: {
        flip: "flip 0.6s ease-in-out",
      },
    },
  },
  plugins: [],
};
