import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#14120F",
        surface: "#1C1915",
        "surface-2": "#26221C",
        paper: "#F2EDE4",
        muted: "#A89F90",
        coral: "#E5535F",
        signal: "#6FB5C4",
        // Soft, elegant color palette inspired by Apple design
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
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.25)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.15)",
        "glow-sm": "0 0 15px rgba(139, 92, 246, 0.3)",
        "glow-md": "0 0 25px rgba(139, 92, 246, 0.4)",
        "glow-lg": "0 0 40px rgba(139, 92, 246, 0.5)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: "0.5",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
          },
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
