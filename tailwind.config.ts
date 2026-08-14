import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/root.tsx",
    "./app/routes/_index.tsx",
    "./app/routes/about.tsx",
    "./app/routes/listen.tsx",
    "./app/components/PlayerDock.tsx",
    "./app/components/radio-passport/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ew-ink)",
        leather: "var(--ew-leather)",
        hide: "var(--ew-hide)",
        bone: "var(--ew-bone)",
        dust: "var(--ew-dust)",
        lacquer: "var(--ew-lacquer)",
        foil: "var(--ew-foil)",
        ether: "var(--ew-ether)",
        charcoal: "var(--ew-ink)",
        surface: "var(--ew-leather)",
        "surface-2": "var(--ew-hide)",
        paper: "var(--ew-bone)",
        muted: "var(--ew-dust)",
        coral: "var(--ew-lacquer)",
        signal: "var(--ew-ether)",
        glass: {
          50: "rgba(255, 255, 255, 0.05)",
          100: "rgba(255, 255, 255, 0.1)",
          200: "rgba(255, 255, 255, 0.15)",
          300: "rgba(255, 255, 255, 0.2)",
        },
        slate: {
          850: "#1a1d2e",
          900: "#0f1117",
          950: "#080a0f",
        },
      },
      fontFamily: {
        display: [
          "Newsreader",
          "Iowan Old Style",
          "Palatino Linotype",
          "serif",
        ],
        sans: [
          "Schibsted Grotesk",
          "Sora",
          "SF Pro Text",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "Azeret Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      borderRadius: {
        stamp: "2px",
      },
      boxShadow: {
        dock: "var(--ew-lift)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.25)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.15)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
