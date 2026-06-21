import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "viper-bg": "#0F0F13",
        "viper-card": "#1A1A22",
        "viper-green": "#00FF66",
        "viper-purple": "#8A2BE2",
        "viper-red": "#FF1444",
        "viper-light-purple": "#C8A8FF",
        "viper-text-grey": "#7D898D",
        "viper-black": "#050507",
        "viper-dark": "#111214",
        "viper-card-bg": "#1A1A22",
        "viper-card-hover": "#22222C",
        base: "#0F0F13",
        surface: "#15151B",
        elevated: "#1A1A22",
        "elevated-hover": "#22222C",
        card: "#1A1A22",
        accent: "#00FF66",
        "accent-hover": "#00E65C",
        "accent-dim": "rgba(0, 255, 102, 0.12)",
        "accent-glow": "rgba(0, 255, 102, 0.25)",
        secondary: "#8A2BE2",
        "secondary-dim": "rgba(138, 43, 226, 0.15)",
        "on-base": "#FFFFFF",
        "on-surface": "#ECECEC",
        muted: "#7D898D",
        dim: "#5A6468",
        border: "rgba(255, 255, 255, 0.06)",
        "border-light": "rgba(255, 255, 255, 0.1)",
        error: "#E06858",
        "error-dim": "rgba(224, 104, 88, 0.15)",
        success: "#6BBF7A",
        "success-dim": "rgba(107, 191, 122, 0.15)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "10px",
        "3xl": "14px",
        "4xl": "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
