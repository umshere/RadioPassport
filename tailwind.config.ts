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
        ink: "#0C0B09",
        leather: "#1A1410",
        hide: "#241C16",
        bone: "#E8DFD0",
        dust: "#9A8F80",
        lacquer: "#C73A3A",
        foil: "#C6A56A",
        ether: "#7EB8B4",
        charcoal: "#0C0B09",
        surface: "#1A1410",
        "surface-2": "#241C16",
        paper: "#E8DFD0",
        muted: "#9A8F80",
        coral: "#C73A3A",
        signal: "#7EB8B4",
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
        dock: "0 -16px 48px rgb(0 0 0 / 0.45)",
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
